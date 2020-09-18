import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Grid from "@material-ui/core/Grid";
import { Typography } from "@material-ui/core";
import Container from "@material-ui/core/Container";
import Box from "@material-ui/core/Box";
import { sizing } from "@material-ui/system";
import Divider from "@material-ui/core/Divider";
import PrintView from "../../print/PrintView";
import { delay } from "../../../utils/Delay";
import Button from "@material-ui/core/Button";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import PrintList from "./PrintList";
import PrintPreview from "./PrintPreview";
import TableOfContents from "./TableOfContents";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import CircularProgress from "@material-ui/core/CircularProgress";

const styles = (theme) => ({
  gridContainer: {
    padding: theme.spacing(4),
    width: "100%",
    height: "80%",
  },
  middleSectionHeader: {
    height: "10%",
  },
  middleSectionMain: {
    height: "90%",
    paddingTop: 10,
    overflowY: "auto",
  },
  footerContainer: {
    padding: theme.spacing(2),
    maxWidth: "100%",

    borderTop: "1px solid grey",
  },
});

class PrintWindow extends React.PureComponent {
  state = {
    printText: true,
    printImages: true,
    printMaps: false,
    allDocumentsToggled: false,
    chapterInformation: this.setChapterInfo(),
    printContent: undefined,
    pdfLoading: false,
  };

  constructor(props) {
    super(props);
    this.printPages = [{ type: "TOC", availableHeight: 950, content: [] }];
    this.mapLinksToPrint = [];
  }

  componentDidMount = () => {
    this.props.localObserver.subscribe(
      "chapter-components-appended",
      (renderedChapters) => {
        this.setState(
          {
            printContent: renderedChapters,
          },
          () => {
            this.printContents();
          }
        );
      }
    );
  };

  componentWillUnmount = () => {
    this.props.localObserver.unsubscribe("chapter-components-appended");
  };

  getAvailableHeight = () => {
    return this.printPages[this.printPages.length - 1].availableHeight;
  };

  checkIfTagIsTitle = (node) => {
    let tagName = "";
    if (node.hasChildNodes() && node.children.length === 1) {
      tagName = node.children[0].tagName;
    }
    return ["H2", "H3"].includes(tagName);
  };

  contentFitsCurrentPage = (content) => {
    let contentHeight = content.clientHeight;
    let availableHeight = this.getAvailableHeight();
    return contentHeight <= availableHeight;
  };

  addContentToNewPage = (content, maxHeight, type) => {
    this.printPages.push({
      type: type,
      availableHeight: maxHeight - content.clientHeight,
      content: [content],
    });
  };

  addContentToCurrentPage = (content) => {
    this.printPages[this.printPages.length - 1].availableHeight -=
      content.clientHeight;
    this.printPages[this.printPages.length - 1].content.push(content);
  };

  addNewPage = (type, maxHeight) => {
    this.printPages.push({
      type: type,
      availableHeight: maxHeight,
      content: [],
    });
  };

  divideContentOnPages = (content, type) => {
    const maxHeight = 950;
    if (this.checkIfTagIsTitle(content)) {
      if (this.getAvailableHeight() >= 0.4 * maxHeight) {
        this.addContentToCurrentPage(content, maxHeight);
      } else {
        this.addContentToNewPage(content, maxHeight, type);
      }

      if (content.children && content.children.length > 0) {
        [...content.children].forEach((child) => {
          this.divideContentOnPages(child, type);
        });
      }
    } else {
      if (
        !this.contentFitsCurrentPage(content) &&
        content.children &&
        content.children.length > 0 &&
        !(type === "TOC" && content.tagName === "LI")
      ) {
        [...content.children].forEach((child) => {
          this.divideContentOnPages(child, type);
        });
      } else if (
        (!this.contentFitsCurrentPage(content) &&
          !(content.children && content.children.length > 0)) ||
        (!this.contentFitsCurrentPage(content) &&
          type === "TOC" &&
          content.tagName === "LI")
      ) {
        this.addContentToNewPage(content, maxHeight, type);
      } else {
        this.addContentToCurrentPage(content, maxHeight);
      }
    }
  };

  getCanvasFromContent = (page) => {
    let sWidth = Math.round((210 * 90) / 25.4);
    let sHeight = Math.round((297 * 90) / 25.4);
    let dWidth = Math.round((210 * 90) / 25.4);
    let dHeight = Math.round((297 * 90) / 25.4);
    let pR = window.devicePixelRatio;
    let onePageDiv = document.createElement("div");
    document.body.appendChild(onePageDiv);
    onePageDiv.style.width = `${210}mm`;
    onePageDiv.style.padding = "50px";

    page.content.forEach((child) => {
      onePageDiv.appendChild(child);
    });

    return html2canvas(onePageDiv, {}).then((canvas) => {
      let onePageCanvas = document.createElement("canvas");
      onePageCanvas.width = Math.round((210 * 90) / 25.4);
      onePageCanvas.height = Math.round((297 * 90) / 25.4);

      let ctx = onePageCanvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, onePageCanvas.width * pR, onePageCanvas.height * pR);

      ctx.drawImage(
        canvas,
        0,
        0,
        sWidth * pR,
        sHeight * pR,
        0,
        0,
        dWidth,
        dHeight
      );
      document.body.removeChild(onePageDiv);
      return onePageCanvas.toDataURL("image/png");
    });
  };

  loadImage = (img) => {
    return new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(img);
    });
  };

  addFooters = (pdf, numToc) => {
    const pageCount = pdf.internal.getNumberOfPages();

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    for (var i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      if (i === 1) {
        pdf.text(
          `Skapad: ${new Date().toLocaleString()}`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 20,
          {
            align: "center",
          }
        );
      } else if (i > numToc) {
        pdf.text(
          `Sida ${i - numToc} av ${pageCount - numToc}`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 20,
          {
            align: "center",
          }
        );
      }
    }
    return pdf;
  };

  printContents = () => {
    const tocElement = document.getElementById("printPreviewTOC");
    const printContent = document.getElementById("printPreviewContent");

    var allImages = [...printContent.getElementsByTagName("img")].map((img) => {
      return this.loadImage(img);
    });

    Promise.allSettled(allImages).then((imageArray) => {
      this.printPages = [{ type: "TOC", availableHeight: 950, content: [] }];
      this.divideContentOnPages(tocElement, "TOC");
      this.addNewPage("CONTENT", 950);
      this.divideContentOnPages(printContent, "CONTENT");
      let numToc = this.printPages.filter((page) => page.type === "TOC").length;

      let pdf = new jsPDF("p", "pt", "a4");
      let promises = [];

      this.printPages.forEach((page, index) => {
        promises.push(this.getCanvasFromContent(page));
      });

      Promise.all(promises).then((canvases) => {
        canvases.forEach((canvas, index) => {
          if (index > 0) {
            pdf.addPage();
          }
          //! now we declare that we're working on that page
          pdf.setPage(index + 1);
          pdf.addImage(canvas, "PNG", 0, 0);
        });
        pdf = this.addFooters(pdf, numToc);
        window.open(
          pdf.output("bloburl", {
            filename: `oversiktsplan-${new Date().toLocaleString()}.pdf`,
          })
        );
        this.toggleAllDocuments(false);
        this.setState({
          pdfLoading: false,
          printContent: undefined,
          printMaps: false,
        });
      });
    });
  };

  handleCheckboxChange = (chapter) => {
    const { model } = this.props;
    let newChapterInformation = [...this.state.chapterInformation];

    let toggledChapter = model.getChapterById(
      newChapterInformation,
      chapter.id
    );
    toggledChapter.chosenForPrint = !toggledChapter.chosenForPrint;
    this.toggleSubChapters(toggledChapter, toggledChapter.chosenForPrint);

    this.setState({
      chapterInformation: newChapterInformation,
      allDocumentsToggled: false,
    });
  };

  toggleSubChapters(chapter, checked) {
    if (Array.isArray(chapter.chapters) && chapter.chapters.length > 0) {
      chapter.chapters.forEach((subChapter) => {
        subChapter.chosenForPrint = checked;
        this.toggleSubChapters(subChapter, checked);
      });
    }
  }

  setChapterInfo() {
    const { activeDocument, model } = this.props;
    let chapterInformation = model.getAllChapterInfo();

    let topChapter = chapterInformation.find(
      (topChapter) =>
        topChapter.headerIdentifier ===
        activeDocument.chapters[0].headerIdentifier
    );

    topChapter.chosenForPrint = true;
    this.toggleSubChapters(topChapter, true);

    return chapterInformation;
  }

  toggleAllDocuments = (toggled) => {
    this.state.chapterInformation.forEach((chapter) => {
      chapter.chosenForPrint = toggled;
      this.toggleSubChapters(chapter, toggled);
    });

    this.setState({
      allDocumentsToggled: toggled,
    });
  };

  test = () => {
    // Create the map canvas that will hold all of our map tiles
    const mapCanvas = document.createElement("canvas");
    // Set canvas dimensions to the newly calculated ones that take user's desired resolution etc into account
    mapCanvas.width = 500;
    mapCanvas.height = 500;

    const mapContext = mapCanvas.getContext("2d");

    // Each canvas element inside OpenLayer's viewport should get printed
    document.querySelectorAll(".ol-viewport canvas").forEach((canvas) => {
      if (canvas.width > 0) {
        const opacity = canvas.parentNode.style.opacity;
        mapContext.globalAlpha = opacity === "" ? 1 : Number(opacity);
        // Get the transform parameters from the style's transform matrix

        if (canvas.style.transform) {
          const matrix = canvas.style.transform
            .match(/^matrix\(([^(]*)\)$/)[1]
            .split(",")
            .map(Number);
          // Apply the transform to the export map context
          CanvasRenderingContext2D.prototype.setTransform.apply(
            mapContext,
            matrix
          );
        }
        mapContext.drawImage(canvas, 0, 0);
      }
    });

    return mapCanvas;
  };

  handleMapElement = async (div) => {
    Array.from(div.getElementsByTagName("a")).forEach((element) => {
      new Promise((resolve) => {
        this.props.localObserver.publish("fly-to-print-view", {
          url: element.getAttribute("data-maplink"),
          resolve: resolve,
        });
      }).then(async () => {
        await delay(3000);
        element.parentNode.replaceChild(this.test(), element);
      });
    });
  };

  removeTagsNotSelectedForPrint = async (chapter) => {
    const { printImages, printText, printMaps } = this.state;

    this.mapLinksToPrint = [];

    let elementsToRemove = [];
    const div = document.createElement("div");
    div.innerHTML = chapter.html;
    if (printMaps) {
      await this.handleMapElement(div);
    }

    Array.from(div.getElementsByTagName("a")).forEach((element) => {
      if (!element.getAttribute("data-maplink")) {
        elementsToRemove.push(element);
      }
    });

    //A-tags should always be removed before printing

    if (!printImages) {
      Array.from(div.getElementsByTagName("figure")).forEach((element) => {
        elementsToRemove.push(element);
      });
    }
    if (!printText) {
      Array.from(div.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).forEach(
        (element) => {
          elementsToRemove.push(element);
        }
      );
      chapter.header = "";
    }

    for (let i = 0; i < elementsToRemove.length; i++) {
      elementsToRemove[i].parentNode.removeChild(elementsToRemove[i]);
    }

    chapter.html = div.innerHTML;
    return chapter;
  };

  prepareChapterForPrint = (chapter) => {
    if (chapter.chapters && chapter.chapters.length > 0) {
      chapter.chapters.forEach((subChapter) => {
        if (subChapter.chapters && subChapter.chapters.length > 0) {
          return this.prepareChapterForPrint(subChapter);
        }
        if (!subChapter.chosenForPrint) {
          subChapter.html = "";
          subChapter.header = "";
        } else {
          subChapter = this.removeTagsNotSelectedForPrint(subChapter);
        }
      });
    }
    if (!chapter.chosenForPrint) {
      chapter.html = "";
      chapter.header = "";
    } else {
      chapter = this.removeTagsNotSelectedForPrint(chapter);
    }
    return chapter;
  };

  getChaptersToPrint = () => {
    let chaptersToPrint = JSON.parse(
      JSON.stringify(this.state.chapterInformation)
    );
    chaptersToPrint.forEach((chapter) => {
      chapter = this.prepareChapterForPrint(chapter);
    });

    return chaptersToPrint;
  };

  createPDF = () => {
    this.setState({ pdfLoading: true });
    const chaptersToPrint = this.getChaptersToPrint();
    this.props.localObserver.publish(
      "append-chapter-components",
      chaptersToPrint
    );
  };

  renderCheckboxes() {
    return (
      <Grid container item alignItems="center" spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Innehåll</Typography>
        </Grid>
        <Grid item xs align="center">
          <FormControlLabel
            value="Texter"
            control={
              <Checkbox
                color="primary"
                checked={this.state.printText}
                onChange={() => {
                  this.setState({
                    printText: !this.state.printText,
                  });
                }}
              />
            }
            label="Texter"
            labelPlacement="end"
          />
        </Grid>
        <Grid item xs align="center">
          <FormControlLabel
            value="Bilder"
            control={
              <Checkbox
                color="primary"
                checked={this.state.printImages}
                onChange={() => {
                  this.setState({
                    printImages: !this.state.printImages,
                  });
                }}
              />
            }
            label="Bilder"
            labelPlacement="end"
          />
        </Grid>
        <Grid item xs align="center">
          <FormControlLabel
            value="Kartor"
            control={
              <Checkbox
                color="primary"
                checked={this.state.printMaps}
                onChange={() => {
                  this.setState({
                    printMaps: !this.state.printMaps,
                  });
                }}
              />
            }
            label="Kartor"
            labelPlacement="end"
          />
        </Grid>
      </Grid>
    );
  }

  renderCreatePDFButton() {
    const { classes } = this.props;
    return (
      <Grid container item className={classes.footerContainer}>
        <Grid
          item
          xs={12}
          container
          alignContent="center"
          alignItems="center"
          justify="center"
        >
          {!this.state.pdfLoading ? (
            <Button
              color="primary"
              variant="contained"
              startIcon={<OpenInNewIcon />}
              onClick={this.createPDF}
            >
              <Typography
                style={{ marginRight: "20px", marginLeft: "20px" }}
                justify="center"
              >
                Skapa PDF-utskrift
              </Typography>
            </Button>
          ) : (
            <CircularProgress size={"2rem"} />
          )}
        </Grid>
      </Grid>
    );
  }

  renderPrintPreview = () => {
    return (
      <PrintPreview>
        <Grid style={{ padding: "50px" }} container>
          <Grid id={"printPreviewTOC"} item>
            <TableOfContents chapters={this.state.chapterInformation} />
          </Grid>
          <Grid id={"printPreviewContent"} item>
            {this.state.printContent}
          </Grid>
        </Grid>
      </PrintPreview>
    );
  };

  render() {
    const {
      classes,
      togglePrintWindow,
      localObserver,
      documentWindowMaximized,
    } = this.props;
    const { chapterInformation } = this.state;
    return (
      <Box boxSizing={"content-box"} height={"100%"}>
        <Box
          boxSizing={"content-box"}
          paddingTop={3}
          paddingLeft={3}
          paddingRight={3}
        >
          <Grid alignItems="center" container>
            <Grid item xs={4}>
              <Button
                color="primary"
                style={{ paddingLeft: 0 }}
                startIcon={<ArrowBackIcon />}
                onClick={togglePrintWindow}
              >
                <Typography justify="center">Tillbaka</Typography>
              </Button>
            </Grid>
            <Grid item xs={4}>
              <Typography align="center" variant="h6">
                Skapa PDF
              </Typography>
            </Grid>
          </Grid>
          <Divider></Divider>
        </Box>
        <Box boxSizing={"content-box"} height={"70%"} padding={3}>
          <Grid
            className={classes.middleSectionHeader}
            alignItems="center"
            alignContent="center"
            justify={"center"}
            container
            item
          >
            <Grid xs={6} item>
              <Grid xs={12} item>
                <Typography variant="h6">Dokument</Typography>
              </Grid>

              <Grid xs={12} item>
                {" "}
                <FormControlLabel
                  value="Välj alla dokument"
                  control={
                    <Checkbox
                      color="primary"
                      checked={this.state.allDocumentsToggled}
                      onChange={() =>
                        this.toggleAllDocuments(!this.state.allDocumentsToggled)
                      }
                    />
                  }
                  label="Välj alla dokument"
                  labelPlacement="end"
                />
              </Grid>
            </Grid>
            <Grid xs={6} item>
              <Grid xs={12} item>
                <Typography variant="h6">Innehåll</Typography>
              </Grid>
              <Grid xs={12} item>
                {" "}
                <FormControlLabel
                  value="Inkludera kartor"
                  control={
                    <Checkbox
                      color="primary"
                      checked={this.state.printMaps}
                      onChange={() =>
                        this.setState({ printMaps: !this.state.printMaps })
                      }
                    />
                  }
                  label="Inkludera kartor"
                  labelPlacement="end"
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid className={classes.middleSectionMain} container>
            <PrintList
              chapters={chapterInformation}
              handleCheckboxChange={this.handleCheckboxChange}
              localObserver={localObserver}
            />
          </Grid>
        </Box>
        <Box boxSizing={"content-box"} padding={3}>
          <Grid container>
            {this.state.printContent && this.renderPrintPreview()}

            {documentWindowMaximized && this.renderCreatePDFButton()}
          </Grid>
        </Box>
      </Box>
    );
  }
}

export default withStyles(styles)(withSnackbar(PrintWindow));

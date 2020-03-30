import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Fab from "@material-ui/core/Fab";
import NavigationIcon from "@material-ui/icons/Navigation";
import Grid from "@material-ui/core/Grid";
import TableOfContents from "./TableOfContents";
import Contents from "./Contents";

const styles = theme => ({
  gridContainer: {
    height: "100%",
    padding: theme.spacing(3),
    overflowY: "scroll",
    overflowX: "hidden"
  },
  scrollToTopButton: {
    position: "fixed",
    bottom: theme.spacing(2),
    right: theme.spacing(3)
  }
});

class DocumentViewer extends React.PureComponent {
  state = {
    showScrollButton: false,
    refObject: {}
  };

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    let showScrollButtonLimit = props.options.showScrollButtonLimit;
    this.model = props.model;
    this.localObserver = props.localObserver;
    this.globalObserver = props.app.globalObserver;
    this.scrollLimit =
      showScrollButtonLimit != null && showScrollButtonLimit !== ""
        ? showScrollButtonLimit
        : 400;
    this.scrollElementRef = React.createRef();

    this.bindSubscriptions();
  }

  bindSubscriptions = () => {
    const { localObserver } = this.props;
    localObserver.subscribe("scroll-to", chapter => {
      chapter.scrollRef.current.scrollIntoView();
    });
  };

  onScroll = e => {
    if (e.target.scrollTop > this.scrollLimit) {
      this.setState({
        showScrollButton: true
      });
    } else {
      this.setState({
        showScrollButton: false
      });
    }
  };

  componentDidUpdate = prevProps => {
    if (prevProps.activeDocument !== this.props.activeDocument) {
      this.scrollToTop();
    }
  };

  scrollToTop = () => {
    this.scrollElementRef.current.scrollTop = 0; //Hack to get it to work in EDGE (non-chromium)
  };

  renderScrollToTopButton = () => {
    const { classes } = this.props;
    return (
      <Fab
        className={classes.scrollToTopButton}
        size="small"
        color="primary"
        aria-label="goto-top"
        onClick={this.scrollToTop}
      >
        <NavigationIcon />
      </Fab>
    );
  };

  render() {
    const {
      classes,
      activeDocument,
      localObserver,
      documentWindowMaximized
    } = this.props;

    const { showScrollButton } = this.state;
    return (
      <>
        <Grid
          onScroll={this.onScroll}
          ref={this.scrollElementRef}
          className={classes.gridContainer}
          container
        >
          <Grid item>
            <TableOfContents
              localObserver={localObserver}
              document={activeDocument}
            />
          </Grid>
          <Grid item>
            <Contents document={activeDocument} />
          </Grid>
        </Grid>
        {showScrollButton &&
          documentWindowMaximized &&
          this.renderScrollToTopButton()}
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(DocumentViewer));

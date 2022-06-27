import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import Button from "@material-ui/core/Button";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { Typography } from "@material-ui/core";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import CircularProgress from "@material-ui/core/CircularProgress";
import KirToolbarView from "../Fir/FirToolbarView";
import Grid from "@material-ui/core/Grid";
import Slider from "@material-ui/core/Slider";

const styles = (theme) => ({
  ageInputContainer: {
    paddingLeft: theme.spacing(2),
    "& input": {
      paddingRight: "8px",
      paddingLeft: "8px",
    },
  },
  input: {
    marginTop: "-4px",
  },
  heading: {
    fontWeight: 500,
  },
  formControl: {
    marginBottom: theme.spacing(3),
  },
  formControlOneMargin: {
    marginBottom: theme.spacing(1),
  },
  checkboxLabel: {
    fontSize: "0.875rem",
    fontWeight: "400",
  },
  checkbox: {
    paddingTop: "0.25rem",
    paddingBottom: "0.25rem",
  },
  subtitle: {
    marginBottom: theme.spacing(1) / 2,
  },
  subtitleShallow: {
    marginBottom: -theme.spacing(1) / 2,
  },
  buttonGroup: {
    width: "100%",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  iconButton: {
    margin: theme.spacing(0),
    paddingLeft: 0,
    paddingRight: 0,
    minWidth: "2.875rem",
    width: "calc(99.9% / 6)",
  },
  clearButton: {
    marginRight: theme.spacing(2),
  },
  containerTopPadded: {
    paddingTop: theme.spacing(2),
  },
  containerTopDoublePadded: {
    paddingTop: theme.spacing(4),
  },
  fileInputContainer: {
    display: "flex",
    alignItems: "center",
    "& > *": {
      display: "flex",
    },
    "& span": {
      whiteSpace: "nowrap",
    },
    "& span.filename": {
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      overflow: "hidden",
      display: "block",
      paddingLeft: theme.spacing(1),
      fontWeight: "300",
    },
  },
  fileInput: {
    display: "none",
  },
  svgImg: {
    height: "24px",
    width: "24px",
  },
  buttonContainedPrimary: {
    "& img": {
      filter: "invert(1)", // fixes icon-colors on geometry icons.
    },
  },
  buttonProgress: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
});
class KirSearchView extends React.PureComponent {
  state = {
    searchText: "",
    searchPanelExpanded: true,
    neighborExpanded: false,
    searchType: "",
    buffer: 0,
    files: { list: [] },
    genderMale: true,
    genderFemale: true,
    showDesignation: true,
    showSearchArea: true,
    loading: false,
    ageValues: [0, 120],
    maxAge: 120,
    minInputValue: 0,
    maxInputValue: 120,
  };

  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
    classes: PropTypes.object.isRequired,
  };

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.inputMaxAge = React.createRef();
    this.inputMinAge = React.createRef();

    this.initListeners();
  }

  initListeners() {
    this.localObserver.subscribe("kir.search.started", () => {
      this.setState({ loading: true });
    });
    this.localObserver.subscribe("kir.search.completed", () => {
      this.setState({ loading: false });
    });
    this.localObserver.subscribe("kir.search.error", () => {
      this.setState({ loading: false });
    });
  }

  handleClearSearch = () => {
    this.localObserver.publish("kir.search.clear", {});
    this.setState({ searchText: "" });
  };

  handleSearch = () => {
    let options = {
      genderMale: this.state.genderMale || false,
      genderFemale: this.state.genderFemale || false,
      ageLower: this.state.ageValues[0],
      ageUpper: this.state.ageValues[1],
      zoomToLayer: true,
    };

    this.localObserver.publish("kir.search.search", options);
  };

  handleAgeChange = (e, newValues) => {
    this.setState({
      ageValues: newValues,
    });
  };

  inputMinAgeChanged = (e, newValue) => {
    this.setState({
      ageValues: [
        e.target.value === "" ? 120 : parseInt(e.target.value),
        this.state.ageValues[1],
      ],
    });
  };

  inputMaxAgeChanged = (e, newValue) => {
    this.setState({
      ageValues: [
        this.state.ageValues[0],
        e.target.value === "" ? 120 : parseInt(e.target.value),
      ],
    });
  };

  render() {
    const { classes } = this.props;
    return (
      <>
        <Accordion
          expanded={this.state.searchPanelExpanded}
          onChange={() => {
            this.setState({
              searchPanelExpanded: !this.state.searchPanelExpanded,
            });
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>Sök invånare</Typography>
          </AccordionSummary>
          <AccordionDetails style={{ display: "block" }}>
            <FormControl className={classes.formControl} fullWidth={true}>
              <KirToolbarView
                prefix="kir"
                model={this.model}
                app={this.props.app}
                localObserver={this.localObserver}
              />
            </FormControl>

            <div>
              <FormControl className={classes.formControl} fullWidth={true}>
                <FormControlLabel
                  classes={{ label: classes.checkboxLabel }}
                  control={
                    <Checkbox
                      className={classes.checkbox}
                      checked={this.state.showSearchArea}
                      onChange={(e) => {
                        this.setState({ showSearchArea: e.target.checked });
                        this.localObserver.publish(
                          "kir.layers.showSearchArea",
                          { value: e.target.checked }
                        );
                      }}
                      color="primary"
                    />
                  }
                  label="Visa buffer/sökområde"
                />
              </FormControl>
            </div>

            <div>
              <FormControl fullWidth={true}>
                <Typography
                  variant="subtitle2"
                  className={classes.subtitleShallow}
                >
                  Inkludera kön:
                </Typography>
                <Grid
                  container
                  className={classes.root}
                  spacing={0}
                  alignItems="center"
                >
                  <FormControlLabel
                    classes={{
                      label: classes.checkboxLabel,
                    }}
                    control={
                      <Checkbox
                        className={classes.checkbox}
                        checked={this.state.genderMale}
                        onChange={(e) => {
                          this.setState({ genderMale: e.target.checked });
                        }}
                        color="primary"
                      />
                    }
                    label="Man"
                  />
                  <FormControlLabel
                    classes={{
                      label: classes.checkboxLabel,
                    }}
                    control={
                      <Checkbox
                        className={classes.checkbox}
                        checked={this.state.genderFemale}
                        onChange={(e) => {
                          this.setState({ genderFemale: e.target.checked });
                        }}
                        color="primary"
                      />
                    }
                    label="Kvinna"
                  />
                </Grid>
              </FormControl>
            </div>

            <div className={classes.containerTopPadded}>
              <Typography
                variant="subtitle2"
                className={classes.subtitleShallow}
              >
                Ålder (från, till):
              </Typography>
              <Grid container spacing={0} alignItems="center">
                <Grid item xs={6}>
                  <Slider
                    value={this.state.ageValues}
                    onChange={this.handleAgeChange}
                    valueLabelDisplay="off"
                    aria-labelledby="range-slider"
                    step={1}
                    min={0}
                    max={this.state.maxAge}
                  />
                </Grid>
                <Grid item xs={3} className={classes.ageInputContainer}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={this.state.ageValues[0]}
                    className={classes.input}
                    onChange={this.inputMinAgeChanged}
                    inputRef={this.inputMinAge}
                    inputProps={{
                      step: 1,
                      min: 0,
                      max: this.state.maxAge,
                      type: "number",
                    }}
                  />
                </Grid>
                <Grid item xs={3} className={classes.ageInputContainer}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={this.state.ageValues[1]}
                    className={classes.input}
                    onChange={this.inputMaxAgeChanged}
                    inputRef={this.inputMaxAge}
                    inputProps={{
                      step: 1,
                      min: 0,
                      max: this.state.maxAge,
                      type: "number",
                    }}
                  />
                </Grid>
              </Grid>
            </div>

            <div
              className={classes.containerTopPadded}
              style={{ textAlign: "right" }}
            >
              <Button
                variant="outlined"
                color="primary"
                component="span"
                size="small"
                onClick={this.handleClearSearch}
                className={classes.clearButton}
              >
                Rensa
              </Button>
              <Button
                variant="contained"
                color="primary"
                component="span"
                size="small"
                onClick={this.handleSearch}
                disabled={this.state.loading}
              >
                Sök
                {this.state.loading && (
                  <CircularProgress
                    size={24}
                    className={classes.buttonProgress}
                  />
                )}
              </Button>
            </div>
          </AccordionDetails>
        </Accordion>
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(KirSearchView));

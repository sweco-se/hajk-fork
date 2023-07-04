import React from "react";
import PropTypes from "prop-types";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import {
  TextField,
  Button,
  Typography,
  Divider,
  Grid,
  Tooltip,
} from "@mui/material";
import styled from "@emotion/styled";
import InactivePolygon from "../img/polygonmarkering.png";
import InactiveRectangle from "../img/rektangelmarkering.png";
import ActivePolygon from "../img/polygonmarkering-blue.png";
import ActiveRectangle from "../img/rektangelmarkering-blue.png";

const StyledSearchButton = styled(Button)(({ theme }) => ({
  borderColor: theme.palette.primary.main,
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const StyledFirstMenuItem = styled(MenuItem)(({ theme }) => ({
  minHeight: 36,
}));

class Stops extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    busStopValue: "stopAreas",
    stopNameOrNr: "",
    publicLineName: "",
    municipalities: [],
    municipality: "",
    selectedFormType: "",
    stopPoint: "",
    internalLineNumber: "",
  };

  // propTypes and defaultProps are static properties, declared
  // as high as possible within the component code. They should
  // be immediately visible to other devs reading the file,
  // since they serve as documentation.
  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
  };

  static defaultProps = {};

  constructor(props) {
    // If you're not using some of properties defined below, remove them from your code.
    // They are shown here for demonstration purposes only.
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
    this.bindSubscriptions();
    this.model.fetchAllPossibleMunicipalityZoneNames().then((result) => {
      this.setState({
        municipalities: result?.length > 0 ? result : [],
      });
    });
  }

  togglePolygonState = () => {
    this.setState({ isPolygonActive: !this.state.isPolygonActive }, () => {
      this.handlePolygonClick();
    });
  };
  toggleRectangleState = () => {
    this.setState({ isRectangleActive: !this.state.isRectangleActive }, () => {
      this.handleRectangleClick();
    });
  };

  handleChange = (event) => {
    this.setState({
      busStopValue: event.target.value,
    });
  };

  handleStopNameOrNrChange = (event) => {
    this.setState({
      stopNameOrNr: event.target.value,
    });
  };

  handleStopPointChange = (event) => {
    this.setState({
      stopPoint: event.target.value,
    });
  };

  handleInternalLineNrChange = (event) => {
    this.setState({
      internalLineNumber: event.target.value,
    });
  };

  handlePublicLineNameChange = (event) => {
    this.setState({
      publicLineName: event.target.value,
    });
  };

  handleMunicipalChange = (event) => {
    this.setState({
      municipality: event.target.value,
    });
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
  };

  bindSubscriptions() {
    const { localObserver } = this.props;
    localObserver.subscribe("vtsearch-result-done", () => {
      this.clearSearchInputAndButtons();
    });
  }

  /**
   * Method that in actives all search inputs and both spatial buttons.
   *
   * @memberof Stops
   */
  clearSearchInputAndButtons = () => {
    this.setState({
      stopNameOrNr: "",
      publicLine: "",
      municipality: "",
      selectedFormType: "",
    });
  };
  inactivateSpatialSearchButtons = () => {
    this.setState({ isPolygonActive: false, isRectangleActive: false });
  };

  doSearch = () => {
    const { busStopValue, stopNameOrNr, publicLine, municipality } = this.state;
    this.localObserver.publish("stops-search", {
      busStopValue: busStopValue,
      stopNameOrNr: stopNameOrNr,
      publicLine: publicLine,
      municipality: municipality.gid,
      selectedFormType: "",
      searchCallback: this.clearSearchInputAndButtons,
    });
  };

  handlePolygonClick = () => {
    const { busStopValue, stopNameOrNr, publicLine, municipality } = this.state;
    if (!this.state.isPolygonActive) {
      this.localObserver.publish("activate-search", () => {});
    }
    if (this.state.isPolygonActive || this.state.isRectangleActive) {
      this.localObserver.publish("deactivate-search", () => {});
      this.setState({ isRectangleActive: false });
    }
    if (this.state.isPolygonActive) {
      this.localObserver.publish("stops-search", {
        busStopValue: busStopValue,
        stopNameOrNr: stopNameOrNr,
        publicLine: publicLine,
        municipality: municipality.name,
        selectedFormType: "Polygon",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
  };
  handleRectangleClick = () => {
    if (!this.state.isRectangleActive) {
      this.localObserver.publish("activate-search", () => {});
    }
    if (this.state.isPolygonActive || this.state.isRectangleActive) {
      this.localObserver.publish("deactivate-search", () => {});
      this.setState({ isPolygonActive: false });
    }
    if (this.state.isRectangleActive) {
      const { busStopValue, stopNameOrNr, publicLine, municipality } =
        this.state;
      this.localObserver.publish("stops-search", {
        busStopValue: busStopValue,
        stopNameOrNr: stopNameOrNr,
        publicLine: publicLine,
        municipality: municipality.name,
        selectedFormType: "Box",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
  };

  renderRadioButtonSection = () => {
    return (
      <Grid item xs={12}>
        <RadioGroup
          aria-label="Stops"
          name="Stop"
          value={this.state.busStopValue}
          onChange={this.handleChange}
        >
          <Grid justifyContent="flex-start" alignItems="center" container>
            <Grid item xs={2}>
              <FormControlLabel
                value="stopAreas"
                control={<Radio color="primary" />}
              />
            </Grid>
            <Grid item xs={10}>
              <Typography variant="body2">HÅLLPLATSOMRÅDE</Typography>
            </Grid>
            <Grid item xs={2}>
              <FormControlLabel
                value="stopPoints"
                control={<Radio color="primary" />}
              />
            </Grid>

            <Grid item xs={10}>
              <Typography variant="body2">HÅLLPLATSLÄGEN</Typography>
            </Grid>
          </Grid>
        </RadioGroup>
      </Grid>
    );
  };

  renderTextParameterSection = () => {
    const { municipalities } = this.state;
    return (
      <>
        <Grid item xs={12}>
          <StyledDivider />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption">HÅLLPLATSNAMN ELLER -NR</Typography>
          <TextField
            fullWidth
            id="standard-basic"
            variant="standard"
            value={this.state.stopNameOrNr}
            onChange={this.handleStopNameOrNrChange}
          ></TextField>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption">HÅLLPLATSLÄGE</Typography>
          <Tooltip title="Sökning sker på ett eller flera lägen via kommaseparerad lista">
            <TextField
              fullWidth
              id="standard-basic"
              variant="standard"
              value={this.state.stopPoint}
              onChange={this.handleStopPointChange}
            ></TextField>
          </Tooltip>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption">LÄNGS PUBLIK LINJE</Typography>
          <TextField
            fullWidth
            id="standard-basic"
            variant="standard"
            value={this.state.publicLineName}
            onChange={this.handlePublicLineNameChange}
          />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption">LÄNGS TEKNISKT LINJENR</Typography>
          <Tooltip title="Sökning sker på ett eller flera nummer via kommaseparerad lista">
            <TextField
              fullWidth
              id="standard-basic"
              variant="standard"
              value={this.state.internalLineNumber}
              onChange={this.handleInternalLineNrChange}
            ></TextField>
          </Tooltip>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <Typography variant="caption">TRAFIKFÖRETAG</Typography>
            <Select
              // value={}
              // onChange={}
              variant="standard"
            ></Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <Typography variant="caption">KOMMUN</Typography>
            <Select
              value={this.state.municipality}
              onChange={this.handleMunicipalChange}
              variant="standard"
            >
              {municipalities.map((municipality, index) => {
                if (municipality.name === "") {
                  return (
                    <StyledFirstMenuItem key={index} value={municipality}>
                      <Typography>{municipality.name}</Typography>
                    </StyledFirstMenuItem>
                  );
                } else {
                  return (
                    <MenuItem key={index} value={municipality}>
                      <Typography>{municipality.name}</Typography>
                    </MenuItem>
                  );
                }
              })}
            </Select>
          </FormControl>
        </Grid>
      </>
    );
  };

  renderSearchButton = () => {
    return (
      <Grid item xs={12}>
        <StyledSearchButton onClick={this.doSearch} variant="outlined">
          <Typography>SÖK</Typography>
        </StyledSearchButton>
      </Grid>
    );
  };

  renderSpatialSearchSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <StyledDivider />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="body2">AVGRÄNSA SÖKOMRÅDE I KARTAN</Typography>
        </Grid>
        <Grid justifyContent="center" container>
          <Grid item xs={4}>
            <div>
              <img
                src={
                  this.state.isPolygonActive ? ActivePolygon : InactivePolygon
                }
                onClick={this.togglePolygonState}
                value={this.state.selectedFormType}
                alt="#"
              ></img>
            </div>
            <Grid item xs={4}>
              <Typography variant="body2">POLYGON</Typography>
            </Grid>
          </Grid>
          <Grid item xs={4}>
            <div>
              <img
                src={
                  this.state.isRectangleActive
                    ? ActiveRectangle
                    : InactiveRectangle
                }
                onClick={this.toggleRectangleState}
                value={this.state.selectedFormType}
                alt="#"
              ></img>
            </div>
            <Grid item xs={4}>
              <Typography variant="body2">REKTANGEL</Typography>
            </Grid>
          </Grid>
        </Grid>
      </>
    );
  };

  render() {
    return (
      <div>
        <Grid
          container
          justifyContent="center"
          spacing={2}
          onKeyPress={this.handleKeyPress}
        >
          {this.renderRadioButtonSection()}
          {this.renderTextParameterSection()}
          {this.renderSearchButton()}
          {this.renderSpatialSearchSection()}
        </Grid>
      </div>
    );
  }
}

// Exporting like this adds some props to DummyView.
// withStyles will add a 'classes' prop, while withSnackbar
// adds to functions (enqueueSnackbar() and closeSnackbar())
// that can be used throughout the Component.
export default Stops;

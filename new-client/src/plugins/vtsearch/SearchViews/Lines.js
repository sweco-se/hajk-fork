import React from "react";
import PropTypes from "prop-types";
// import withStyles from "@mui/styles/withStyles";
import { styled } from "@mui/material/styles";
import {
  TextField,
  Button,
  Typography,
  Divider,
  Grid,
  FormControl,
  Tooltip,
} from "@mui/material";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InactivePolygon from "../img/polygonmarkering.png";
import InactiveRectangle from "../img/rektangelmarkering.png";
import ActivePolygon from "../img/polygonmarkering-blue.png";
import ActiveRectangle from "../img/rektangelmarkering-blue.png";

// Define JSS styles that will be used in this component.
// Example below utilizes the very powerful "theme" object
// that gives access to some constants, see: https://material-ui.com/customization/default-theme/

//TODO - Only mockup //Tobias

const StyledSearchButton = styled(Button)(({ theme }) => ({
  marginTop: 8,
  borderColor: theme.palette.primary.main,
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

const StyledErrorMessageTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));

class Lines extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    publicLineName: "",
    internalLineNumber: "",
    municipalities: [],
    municipality: "",
    trafficTransports: [],
    trafficTransport: "",
    transportCompany: "",
    transportCompanies: [],
    throughStopArea: "",
    throughStopPoint: "",
    searchErrorMessage: "",
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
      this.model.fetchAllPossibleTransportModeTypeNames().then((result) => {
        this.setState({
          trafficTransports: result.length > 0 ? result : [],
        });
        this.model.fetchAllPossibleTransportCompanyNames().then((result) => {
          this.setState({
            transportCompanies: result.length > 0 ? result : [],
          });
        });
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
  bindSubscriptions() {
    const { localObserver } = this.props;
    localObserver.subscribe("vtsearch-result-done", () => {
      this.clearSearchInputAndButtons();
    });
  }
  /**
   * Method that in actives all search inputs and both spatial buttons.
   *
   * @memberof Lines
   */
  inactivateSpatialSearchButtons = () => {
    this.setState({ isPolygonActive: false, isRectangleActive: false });
  };

  clearSearchInputAndButtons = () => {
    this.setState({
      publicLineName: "",
      internalLineNumber: "",
      municipality: "",
      trafficTransport: "",
      throughStopArea: "",
      throughStopPoint: "",
      searchErrorMessage: "",
    });
  };

  doSearch = () => {
    const {
      publicLineName,
      internalLineNumber,
      municipality,
      trafficTransport,
      throughStopArea,
      throughStopPoint,
    } = this.state;

    let validationErrorMessage = this.validateSearchForm();
    if (validationErrorMessage) {
      console.log(validationErrorMessage);
      this.setState({
        searchErrorMessage: validationErrorMessage,
      });
      return;
    }

    this.localObserver.publish("routes-search", {
      publicLineName: publicLineName,
      internalLineNumber: internalLineNumber,
      municipality: municipality.gid,
      trafficTransport: trafficTransport,
      throughStopArea: throughStopArea,
      //throughStopPoint: throughStopPoint,
      selectedFormType: "",
      searchCallback: this.clearSearchInputAndButtons,
    });
  };

  handlePolygonClick = () => {
    const {
      publicLineName,
      internalLineNumber,
      municipality,
      trafficTransport,
      throughStopArea,
    } = this.state;
    if (!this.state.isPolygonActive) {
      this.localObserver.publish("activate-search", () => {});
    }
    if (this.state.isPolygonActive || this.state.isRectangleActive) {
      this.localObserver.publish("deactivate-search", () => {});
      this.setState({ isRectangleActive: false });
    }
    if (this.state.isPolygonActive) {
      this.localObserver.publish("routes-search", {
        publicLineName: publicLineName,
        internalLineNumber: internalLineNumber,
        municipality: municipality.gid,
        trafficTransport: trafficTransport,
        throughStopArea: throughStopArea,
        selectedFormType: "Polygon",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
  };

  handleRectangleClick = () => {
    const {
      publicLineName,
      internalLineNumber,
      municipality,
      trafficTransport,
      throughStopArea,
    } = this.state;
    if (!this.state.isRectangleActive) {
      this.localObserver.publish("activate-search", () => {});
    }
    if (this.state.isRectangleActive || this.state.isPolygonActive) {
      this.localObserver.publish("deactivate-search", () => {});
      this.setState({ isPolygonActive: false });
    }
    if (this.state.isRectangleActive) {
      this.localObserver.publish("routes-search", {
        publicLineName: publicLineName,
        internalLineNumber: internalLineNumber,
        municipality: municipality.gid,
        trafficTransportName: trafficTransport,
        throughStopArea: throughStopArea,
        selectedFormType: "Box",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
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

  handleMunicipalChange = (e) => {
    this.setState({
      municipality: e.target.value,
    });
  };

  handleTrafficTransportChange = (e) => {
    this.setState({
      trafficTransport: e.target.value,
    });
  };

  handleTransportCompanyChange = (e) => {
    this.setState({
      transportCompany: e.target.value,
    });
  };

  handleThroughStopAreaChange = (event) => {
    this.setState({
      throughStopArea: event.target.value,
      searchErrorMessage: "",
    });
  };

  handleThroughStopPointChange = (event) => {
    const { searchErrorMessage } = this.state;
    this.setState({
      throughStopPoint: event.target.value,
      searchErrorMessage: event.target.value ? searchErrorMessage : "",
    });
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
  };

  renderPublicAndTechnicalNrSection = () => {
    return (
      <>
        <Grid item xs={6}>
          <Typography variant="caption">PUBLIKT NR</Typography>
          <TextField
            id="standard-helperText"
            onChange={this.handlePublicLineNameChange}
            value={this.state.publicLineName}
            variant="standard"
          />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption">TEKNISKT NR</Typography>
          <Tooltip title="Sökning sker på ett eller flera nummer via kommaseparerad lista">
            <TextField
              id="standard-helperText"
              onChange={this.handleInternalLineNrChange}
              value={this.state.internalLineNumber}
              variant="standard"
            />
          </Tooltip>
        </Grid>
      </>
    );
  };

  renderInputValueSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">VIA HÅLLPLATSNAMN ELLER -NR</Typography>
          <TextField
            fullWidth
            id="standard-helperText"
            value={this.state.throughStopArea}
            onChange={this.handleThroughStopAreaChange}
            variant="standard"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption">VIA HÅLLPLATSLÄGE</Typography>
          <Tooltip title="Sökning sker på ett eller flera lägen via kommaseparerad lista">
            <TextField
              fullWidth
              id="standard-helperText"
              value={this.state.throughStopPoint}
              onChange={this.handleThroughStopPointChange}
              variant="standard"
            />
          </Tooltip>
        </Grid>
      </>
    );
  };

  renderTransportCompanySection = () => {
    const { transportCompanies } = this.state;
    return (
      <Grid item xs={12}>
        <FormControl fullWidth>
          <Typography variant="caption">TRAFIKFÖRETAG</Typography>
          <Select
            value={this.state.transportCompany}
            onChange={this.handleTransportCompanyChange}
            variant="standard"
          >
            {transportCompanies.map((name, index) => {
              if (name === "") {
                return (
                  <MenuItem key={index} value={name}>
                    {name}
                  </MenuItem>
                );
              } else {
                return (
                  <MenuItem key={index} value={name}>
                    <Typography>{name}</Typography>
                  </MenuItem>
                );
              }
            })}
          </Select>
        </FormControl>
      </Grid>
    );
  };

  renderTrafficTypeSection = () => {
    const { trafficTransports } = this.state;
    return (
      <Grid item xs={12}>
        <FormControl fullWidth>
          <Typography variant="caption">TRAFIKSLAG</Typography>
          <Select
            value={this.state.trafficTransport}
            onChange={this.handleTrafficTransportChange}
            variant="standard"
          >
            {trafficTransports.map((name, index) => {
              if (name === "") {
                return (
                  <MenuItem key={index} value={name}>
                    {name}
                  </MenuItem>
                );
              } else {
                return (
                  <MenuItem key={index} value={name}>
                    <Typography>{name}</Typography>
                  </MenuItem>
                );
              }
            })}
          </Select>
        </FormControl>
      </Grid>
    );
  };
  renderMunicipalitySection = () => {
    const { municipalities } = this.state;
    return (
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
                  <MenuItem key={index} value={municipality}>
                    <Typography>{municipality.name}</Typography>
                  </MenuItem>
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
    );
  };

  renderSearchButtonSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <StyledSearchButton onClick={this.doSearch} variant="outlined">
            <StyledTypography>SÖK</StyledTypography>
          </StyledSearchButton>
        </Grid>
        <Grid item xs={12}>
          {this.showErrorMessage()}
        </Grid>
      </>
    );
  };

  renderErrorMessage = (errorMessage) => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          {errorMessage}
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  renderNoErrorMessage = () => {
    return <Typography></Typography>;
  };

  validateSearchForm = () => {
    const { throughStopArea, throughStopPoint } = this.state;
    if (throughStopPoint && !throughStopArea)
      return "DET GÅR INTE ATT SÖKA PÅ HÅLLPLATSLÄGE UTAN ATT HA FYLLT I HÅLLPLATSNAMN ELLER NUMMER.";

    return "";
  };

  showErrorMessage = () => {
    const { searchErrorMessage } = this.state;

    if (searchErrorMessage) return this.renderErrorMessage(searchErrorMessage);

    return this.renderNoErrorMessage();
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
          {this.renderPublicAndTechnicalNrSection()}
          {this.renderInputValueSection()}
          {this.renderTransportCompanySection()}
          {this.renderTrafficTypeSection()}
          {this.renderMunicipalitySection()}
          {this.renderSearchButtonSection()}
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
export default Lines;

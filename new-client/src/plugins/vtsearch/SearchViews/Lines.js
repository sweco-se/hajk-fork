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
import { validateInternalLineNumber } from "./Validator";

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

const StyledErrorMessageTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const SEARCH_ERROR_MESSAGE =
  "DET GÅR INTE ATT SÖKA PÅ HÅLLPLATSLÄGE UTAN ATT HA FYLLT I HÅLLPLATSNAMN ELLER -NR.";

class Lines extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    spatialToolsEnabled: true,
    searchButtonEnabled: true,
    publicLineName: "",
    internalLineNumber: "",
    municipalities: [],
    municipality: "",
    trafficTransports: [],
    trafficTransport: "",
    transportCompany: "",
    transportCompanies: [],
    throughStopArea: "",
    designation: "",
    searchErrorMessage: "",
    internalLineErrorMessage: "",
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
    if (!this.state.spatialToolsEnabled) return;
    this.setState({ isPolygonActive: !this.state.isPolygonActive }, () => {
      this.handlePolygonClick();
    });
  };
  toggleRectangleState = () => {
    if (!this.state.spatialToolsEnabled) return;
    this.setState({ isRectangleActive: !this.state.isRectangleActive }, () => {
      this.handleRectangleClick();
    });
  };
  bindSubscriptions() {
    const { localObserver } = this.props;
    localObserver.subscribe("vt-result-done", () => {
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
      designation: "",
      transportCompany: "",
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
      designation,
      transportCompany,
    } = this.state;

    let validationErrorMessage = this.#validateSearchForm();
    if (validationErrorMessage) {
      this.setState({
        searchErrorMessage: validationErrorMessage,
      });
      return;
    }

    this.localObserver.publish("vt-routes-search", {
      publicLineName: publicLineName,
      internalLineNumber: internalLineNumber,
      municipality: municipality.gid,
      trafficTransport: trafficTransport,
      throughStopArea: throughStopArea,
      designation: designation,
      transportCompanyName: transportCompany,
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
      designation,
      transportCompany,
    } = this.state;

    if (this.state.isRectangleActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (!this.state.isPolygonActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (this.state.isPolygonActive || this.state.isRectangleActive) {
      this.localObserver.publish("vt-deactivate-search", () => {});
      this.setState({ isRectangleActive: false });
    }
    if (this.state.isPolygonActive) {
      let validationErrorMessage = this.#validateSearchForm();
      if (validationErrorMessage) {
        this.localObserver.publish("vt-activate-search", () => {});
        this.setState({
          searchErrorMessage: validationErrorMessage,
          isPolygonActive: false,
        });
        return;
      }

      this.localObserver.publish("vt-routes-search", {
        publicLineName: publicLineName,
        internalLineNumber: internalLineNumber,
        municipality: municipality.gid,
        trafficTransport: trafficTransport,
        throughStopArea: throughStopArea,
        designation: designation,
        transportCompanyName: transportCompany,
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
      designation,
      transportCompany,
    } = this.state;

    if (this.state.isPolygonActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (!this.state.isRectangleActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (this.state.isRectangleActive || this.state.isPolygonActive) {
      this.localObserver.publish("vt-deactivate-search", () => {});
      this.setState({ isPolygonActive: false });
    }
    if (this.state.isRectangleActive) {
      let validationErrorMessage = this.#validateSearchForm();
      if (validationErrorMessage) {
        this.localObserver.publish("vt-activate-search", () => {});
        this.setState({
          searchErrorMessage: validationErrorMessage,
          isRectangleActive: false,
        });
        return;
      }

      this.localObserver.publish("vt-routes-search", {
        publicLineName: publicLineName,
        internalLineNumber: internalLineNumber,
        municipality: municipality.gid,
        trafficTransportName: trafficTransport,
        throughStopArea: throughStopArea,
        designation: designation,
        transportCompanyName: transportCompany,
        selectedFormType: "Box",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
  };

  handleInternalLineNrChange = (event) => {
    let validationMessage = validateInternalLineNumber(event.target.value)
      ? ""
      : "Fel värde på tekniskt nr";

    this.setState(
      {
        internalLineNumber: event.target.value,
        internalLineErrorMessage: validationMessage,
      },
      () => {
        this.#validateParameters(this.#disableSearch, this.#enableSearch);
      }
    );
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

  // handleDesignationChange = (e) => {
  //   this.setState({
  //     designation: e.target.value,
  //   });
  // };

  handleThroughStopAreaChange = (event) => {
    const { designation, isPolygonActive, isRectangleActive } = this.state;

    this.setState({
      throughStopArea: event.target.value,
      searchErrorMessage: "",
    });

    if (
      (isPolygonActive || isRectangleActive) &&
      designation &&
      !event.target.value
    ) {
      this.localObserver.publish("vt-activate-search", () => {});
      this.setState({
        searchErrorMessage: SEARCH_ERROR_MESSAGE,
        isPolygonActive: false,
        isRectangleActive: false,
      });
    }
  };

  handleDesignationChange = (event) => {
    const {
      searchErrorMessage,
      throughStopArea,
      isPolygonActive,
      isRectangleActive,
    } = this.state;

    this.setState({
      designation: event.target.value,
      searchErrorMessage: event.target.value ? searchErrorMessage : "",
    });

    if (
      (isPolygonActive || isRectangleActive) &&
      event.target.value &&
      !throughStopArea
    ) {
      this.localObserver.publish("vt-activate-search", () => {});
      this.setState({
        searchErrorMessage: SEARCH_ERROR_MESSAGE,
        isPolygonActive: false,
        isRectangleActive: false,
      });
    }
  };

  #handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
  };

  #disableSearch = () => {
    this.setState({ spatialToolsEnabled: false, searchButtonEnabled: false });
  };

  #enableSearch = () => {
    this.setState({ spatialToolsEnabled: true, searchButtonEnabled: true });
  };

  #renderPublicAndTechnicalNrSection = () => {
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
              error={!(this.state.internalLineErrorMessage === "")}
              helperText={this.state.internalLineErrorMessage}
              variant="standard"
            />
          </Tooltip>
        </Grid>
      </>
    );
  };

  #renderInputValueSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">VIA HÅLLPLATSNAMN ELLER -NR</Typography>
          <TextField
            fullWidth
            id="standard-helperText"
            value={this.state.throughStopArea}
            onChange={this.handleThroughStopAreaChange}
            error={!(this.state.searchErrorMessage === "")}
            variant="standard"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption">VIA HÅLLPLATSLÄGE</Typography>
          <Tooltip title="Sökning sker på ett eller flera lägen via kommaseparerad lista">
            <TextField
              fullWidth
              id="standard-helperText"
              value={this.state.designation}
              onChange={this.handleDesignationChange}
              variant="standard"
            />
          </Tooltip>
        </Grid>
      </>
    );
  };

  #renderTransportCompanySection = () => {
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

  #renderTrafficTypeSection = () => {
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
  #renderMunicipalitySection = () => {
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

  #renderSearchButtonSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <StyledSearchButton
            onClick={this.doSearch}
            variant="outlined"
            disabled={!this.state.searchButtonEnabled}
          >
            <Typography>SÖK</Typography>
          </StyledSearchButton>
        </Grid>
      </>
    );
  };

  #renderSearchErrorMessage = (errorMessage) => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          {errorMessage}
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  #renderNoErrorMessage = () => {
    return <Typography></Typography>;
  };

  #validateSearchForm = () => {
    const { throughStopArea, designation } = this.state;
    if (designation && !throughStopArea) return SEARCH_ERROR_MESSAGE;

    return "";
  };

  #validateParameters = (callbackInvalidInernalLineNumber, callbackAllIsOK) => {
    const { internalLineErrorMessage } = this.state;

    if (internalLineErrorMessage) return callbackInvalidInernalLineNumber();

    if (callbackAllIsOK) return callbackAllIsOK();
  };

  #showValidateParametersErrorMessage = () => {
    return this.#validateParameters(
      this.#renderErrorMessageInvalidInternalLine,
      this.#renderNoErrorMessage
    );
  };

  #showSearchErrorMessage = () => {
    const { searchErrorMessage } = this.state;

    if (searchErrorMessage)
      return this.#renderSearchErrorMessage(searchErrorMessage);

    return this.#renderNoErrorMessage();
  };

  #renderErrorMessageInvalidInternalLine = () => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          TEKNISKT NR MÅSTE VARA ETT HELTAL ELLER FLERA HELTAL SEPARERADE MED
          KOMMATECKEN
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  #renderSpatialSearchSection = () => {
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
          onKeyPress={this.#handleKeyPress}
        >
          {this.#renderPublicAndTechnicalNrSection()}
          {this.#renderInputValueSection()}
          {this.#renderTransportCompanySection()}
          {this.#renderTrafficTypeSection()}
          {this.#renderMunicipalitySection()}
          {this.#renderSearchButtonSection()}
          {this.#showValidateParametersErrorMessage()}
          {this.#showSearchErrorMessage()}
          {this.#renderSpatialSearchSection()}
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

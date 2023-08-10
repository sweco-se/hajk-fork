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
import { validateInternalLineNumber } from "./Validator";

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

const StyledErrorMessageTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const SEARCH_ERROR_MESSAGE =
  "DET GÅR INTE ATT SÖKA PÅ HÅLLPLATSLÄGE UTAN ATT HA FYLLT I HÅLLPLATSNAMN ELLER -NR.";

class Stops extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    spatialToolsEnabled: true,
    searchButtonEnabled: true,
    busStopValue: "stopAreas",
    stopNameOrNr: "",
    publicLineName: "",
    municipalities: [],
    municipality: "",
    selectedFormType: "",
    stopPoint: "",
    internalLineNumber: "",
    transportCompany: "",
    transportCompanies: [],
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
      this.model.fetchAllPossibleTransportCompanyNames().then((result) => {
        this.setState({
          transportCompanies: result.length > 0 ? result : [],
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

  handleChange = (event) => {
    const { stopPoint, stopNameOrNr, isPolygonActive, isRectangleActive } =
      this.state;

    this.setState({
      busStopValue: event.target.value,
      searchErrorMessage: "",
    });

    if (
      event.target.value === "stopPoints" &&
      (isPolygonActive || isRectangleActive) &&
      stopPoint &&
      !stopNameOrNr
    ) {
      this.localObserver.publish("vt-activate-search", () => {});
      this.setState({
        searchErrorMessage: SEARCH_ERROR_MESSAGE,
        isPolygonActive: false,
        isRectangleActive: false,
      });
    }
  };

  handleStopNameOrNrChange = (event) => {
    const { stopPoint, isPolygonActive, isRectangleActive, busStopValue } =
      this.state;

    this.setState({
      stopNameOrNr: event.target.value,
      searchErrorMessage: "",
    });

    if (
      busStopValue === "stopPoints" &&
      (isPolygonActive || isRectangleActive) &&
      stopPoint &&
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

  handleStopPointChange = (event) => {
    const {
      searchErrorMessage,
      stopNameOrNr,
      busStopValue,
      isPolygonActive,
      isRectangleActive,
    } = this.state;

    this.setState({
      stopPoint: event.target.value,
      searchErrorMessage: event.target.value ? searchErrorMessage : "",
    });

    if (
      busStopValue === "stopPoints" &&
      (isPolygonActive || isRectangleActive) &&
      event.target.value &&
      !stopNameOrNr
    ) {
      this.localObserver.publish("vt-activate-search", () => {});
      this.setState({
        searchErrorMessage: SEARCH_ERROR_MESSAGE,
        isPolygonActive: false,
        isRectangleActive: false,
      });
    }
  };

  handleInternalLineNrChange = (event) => {
    let validationMessage = validateInternalLineNumber(event.target.value)
      ? ""
      : "Fel värde på tekniskt linjenr";

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

  #disableSearch = () => {
    this.setState({ spatialToolsEnabled: false, searchButtonEnabled: false });
  };

  #enableSearch = () => {
    this.setState({ spatialToolsEnabled: true, searchButtonEnabled: true });
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

  handleTransportCompanyChange = (e) => {
    this.setState({
      transportCompany: e.target.value,
    });
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
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
   * @memberof Stops
   */
  clearSearchInputAndButtons = () => {
    this.setState({
      stopNameOrNr: "",
      publicLineName: "",
      municipality: "",
      selectedFormType: "",
      stopPoint: "",
      internalLineNumber: "",
      transportCompany: "",
      searchErrorMessage: "",
    });
  };

  inactivateSpatialSearchButtons = () => {
    this.setState({ isPolygonActive: false, isRectangleActive: false });
  };

  doSearch = () => {
    const {
      busStopValue,
      stopNameOrNr,
      publicLineName,
      municipality,
      stopPoint,
      internalLineNumber,
      transportCompany,
    } = this.state;

    let validationErrorMessage = this.validateSearchForm();
    if (validationErrorMessage) {
      this.setState({
        searchErrorMessage: validationErrorMessage,
      });
      return;
    }

    this.localObserver.publish("vt-stops-search", {
      busStopValue: busStopValue,
      stopNameOrNr: stopNameOrNr,
      publicLine: publicLineName,
      municipality: municipality.gid,
      stopPoint: stopPoint,
      internalLineNumber: internalLineNumber,
      transportCompany: transportCompany,
      selectedFormType: "",
      searchCallback: this.clearSearchInputAndButtons,
    });
  };

  handlePolygonClick = () => {
    const {
      busStopValue,
      stopNameOrNr,
      publicLineName,
      municipality,
      stopPoint,
      internalLineNumber,
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
      let validationErrorMessage = this.validateSearchForm();
      if (validationErrorMessage) {
        this.localObserver.publish("vt-activate-search", () => {});
        this.setState({
          searchErrorMessage: validationErrorMessage,
          isPolygonActive: false,
        });
        return;
      }

      this.localObserver.publish("vt-stops-search", {
        busStopValue: busStopValue,
        stopNameOrNr: stopNameOrNr,
        publicLine: publicLineName,
        municipality: municipality.gid,
        stopPoint: stopPoint,
        internalLineNumber: internalLineNumber,
        transportCompany: transportCompany,
        selectedFormType: "Polygon",
        searchCallback: this.inactivateSpatialSearchButtons,
      });
    }
  };
  handleRectangleClick = () => {
    if (this.state.isPolygonActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (!this.state.isRectangleActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
    if (this.state.isPolygonActive || this.state.isRectangleActive) {
      this.localObserver.publish("vt-deactivate-search", () => {});
      this.setState({ isPolygonActive: false });
    }
    if (this.state.isRectangleActive) {
      const {
        busStopValue,
        stopNameOrNr,
        publicLineName,
        municipality,
        stopPoint,
        internalLineNumber,
        transportCompany,
      } = this.state;

      let validationErrorMessage = this.validateSearchForm();
      if (validationErrorMessage) {
        this.localObserver.publish("vt-activate-search", () => {});
        this.setState({
          searchErrorMessage: validationErrorMessage,
          isRectangleActive: false,
        });
        return;
      }
      this.localObserver.publish("vt-stops-search", {
        busStopValue: busStopValue,
        stopNameOrNr: stopNameOrNr,
        publicLine: publicLineName,
        municipality: municipality.gid,
        stopPoint: stopPoint,
        internalLineNumber: internalLineNumber,
        transportCompany: transportCompany,
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

  renderStopPointSection = () => {
    if (this.state.busStopValue !== "stopPoints") return <></>;
    return (
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
    );
  };
  renderTextParameterSection = () => {
    const { municipalities, transportCompanies } = this.state;
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
            error={!(this.state.searchErrorMessage === "")}
          ></TextField>
        </Grid>
        {this.renderStopPointSection()}
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
              error={!(this.state.internalLineErrorMessage === "")}
              helperText={this.state.internalLineErrorMessage}
            ></TextField>
          </Tooltip>
        </Grid>
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
        <StyledSearchButton
          onClick={this.doSearch}
          variant="outlined"
          disabled={!this.state.searchButtonEnabled}
        >
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

  renderErrorMessage = (errorMessage) => {
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

  #renderErrorMessageInvalidInternalLine = () => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          TEKNISKT LINJENR MÅSTE VARA ETT HELTAL ELLER FLERA HELTAL SEPARERADE
          MED KOMMATECKEN
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  validateSearchForm = () => {
    const { stopNameOrNr, stopPoint, busStopValue } = this.state;

    if (stopPoint && !stopNameOrNr && busStopValue === "stopPoints")
      return SEARCH_ERROR_MESSAGE;

    return "";
  };

  #showValidateParametersErrorMessage = () => {
    return this.#validateParameters(
      this.#renderErrorMessageInvalidInternalLine,
      this.#renderNoErrorMessage
    );
  };

  #showSearchErrorMessage = () => {
    const { searchErrorMessage } = this.state;

    if (searchErrorMessage) return this.renderErrorMessage(searchErrorMessage);

    return this.#renderNoErrorMessage();
  };

  #validateParameters = (callbackInvalidInernalLineNumber, callbackAllIsOK) => {
    const { internalLineErrorMessage } = this.state;

    if (internalLineErrorMessage) return callbackInvalidInernalLineNumber();

    if (callbackAllIsOK) return callbackAllIsOK();
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
          {this.#showSearchErrorMessage()}
          {this.#showValidateParametersErrorMessage()}
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

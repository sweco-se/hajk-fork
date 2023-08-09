import React from "react";
import PropTypes from "prop-types";
import { styled } from "@mui/material/styles";
import { Typography, Divider, TextField, Tooltip, Button } from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  LocalizationProvider,
  TimePicker,
  DatePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import InactivePolygon from "../img/polygonmarkering.png";
import InactiveRectangle from "../img/rektangelmarkering.png";
import ActivePolygon from "../img/polygonmarkering-blue.png";
import ActiveRectangle from "../img/rektangelmarkering-blue.png";
import {
  validateInternalLineNumber,
  removeTralingCommasFromCommaSeparatedString,
} from "./Validator";

const StyledErrorMessageTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const StyledLocalizationProvider = styled(LocalizationProvider)(() => ({
  marginTop: 2,
}));

const StyledTimePicker = styled(TimePicker)(({ theme }) => ({
  marginTop: 0,
  marginBottom: 1,
  width: "99%",
  color: theme.palette.primary.main,
}));

const StyledDatePicker = styled(DatePicker)(() => ({
  marginBottom: 5,
  width: "99%",
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

const StyledSearchButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(1),
  borderColor: theme.palette.primary.main,
}));

const SEARCH_ERROR_MESSAGE =
  "DET GÅR INTE ATT SÖKA PÅ HÅLLPLATSLÄGE UTAN ATT HA FYLLT I HÅLLPLATSNAMN ELLER NUMMER.";

class Journeys extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    spatialToolsEnabled: true,
    searchButtonEnabled: true,
    isPolygonActive: false,
    isRectangleActive: false,
    selectedFromDate: new Date(new Date().setHours(0, 0, 0, 0)),
    selectedFromTime: new Date(
      new Date().setHours(new Date().getHours(), new Date().getMinutes(), 0, 0)
    ),
    selectedEndDate: new Date(new Date().setHours(0, 0, 0, 0)),
    selectedEndTime: new Date(
      new Date().setHours(
        new Date().getHours() + 1,
        new Date().getMinutes(),
        0,
        0
      )
    ),
    selectedFormType: "",
    fromTimeInputErrorMessage: "",
    fromDateInputErrorMessage: "",
    endTimeInputErrorMessage: "",
    endDateInputErrorMessage: "",
    publicLineName: "",
    internalLineNumber: "",
    stopArea: "",
    stopPoint: "",
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
  }

  bindSubscriptions() {
    const { localObserver } = this.props;
    localObserver.subscribe("vt-result-done", () => {
      this.clearSearchInputAndButtons();
    });
  }

  clearSearchInputAndButtons = () => {
    this.setState({
      selectedFromDate: new Date(new Date().setHours(0, 0, 0, 0)),
      selectedFromTime: new Date(
        new Date().setHours(
          new Date().getHours(),
          new Date().getMinutes(),
          0,
          0
        )
      ),
      selectedEndDate: new Date(new Date().setHours(0, 0, 0, 0)),
      selectedEndTime: new Date(
        new Date().setHours(
          new Date().getHours() + 1,
          new Date().getMinutes(),
          0,
          0
        )
      ),
      publicLineName: "",
      internalLineNumber: "",
      stopArea: "",
      stopPoint: "",
      searchErrorMessage: "",
      fromTimeInputErrorMessage: "",
      fromDateInputErrorMessage: "",
      endTimeInputErrorMessage: "",
      endDateInputErrorMessage: "",
    });
  };

  doSearch = () => {
    const { publicLineName, internalLineNumber, stopArea, stopPoint } =
      this.state;
    const { formatFromDate, formatEndDate } = this.getFormattedDate();

    let validationErrorMessage = this.validateSearchForm();
    if (validationErrorMessage) {
      this.setState({
        searchErrorMessage: validationErrorMessage,
      });
      return;
    }

    let checkedInternalLineNumber =
      removeTralingCommasFromCommaSeparatedString(internalLineNumber);
    // this.clearSearchInputAndButtons();
    this.localObserver.publish("vt-journeys-search", {
      selectedFromDate: formatFromDate,
      selectedEndDate: formatEndDate,
      publicLine: publicLineName,
      internalLineNumber: checkedInternalLineNumber,
      stopArea: stopArea,
      stopPoint: stopPoint,
      selectedFormType: "",
      searchCallback: this.clearSearchInputAndButtons,
    });
  };

  handleFromTimeChange = (fromTime) => {
    this.updateStateForTimeOrDateChange(fromTime);

    // Bug in KeyboardTimePicker, sends today instead of correct date. Merge date and time to fix it.
    const newFromTime = this.mergeDateIntoTime(
      this.state.selectedFromDate,
      fromTime
    );
    if (this.isTimeOrDateValid(newFromTime)) fromTime = newFromTime;

    this.setState(
      {
        selectedFromTime: fromTime,
        fromTimeInputErrorMessage: "",
      },
      () => {
        this.#validateParameters(
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#enableSearch
        );
      }
    );
    this.addOneHourTime(fromTime);
  };

  handleFromDateChange = (fromDate) => {
    this.updateStateForTimeOrDateChange(fromDate);
    const newFromTime = this.mergeDateIntoTime(
      fromDate,
      this.state.selectedFromTime
    );
    const newEndTime = this.mergeDateIntoTime(
      fromDate,
      this.state.selectedEndTime
    );
    let fromTime = this.state.selectedFromTime;
    let endTime = this.state.selectedEndTime;
    if (
      this.isTimeOrDateValid(newFromTime) &&
      this.isTimeOrDateValid(newEndTime)
    ) {
      fromTime = newFromTime;
      endTime = newEndTime;
    }

    let endDate = this.state.selectedEndDate;
    if (this.isTimeOrDateValid(fromDate)) endDate = fromDate;

    this.setState(
      {
        selectedFromDate: fromDate,
        selectedFromTime: fromTime,
        selectedEndDate: endDate,
        selectedEndTime: endTime,
        fromDateInputErrorMessage: "",
      },
      () => {
        this.#validateParameters(
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#enableSearch
        );
      }
    );
  };

  handleEndTimeChange = (endTime) => {
    this.updateStateForTimeOrDateChange(endTime);

    // Bug in KeyboardTimePicker, sends today instead of correct date. Merge date and time to fix it.
    const newEndTime = this.mergeDateIntoTime(
      this.state.selectedEndDate,
      endTime
    );
    if (this.isTimeOrDateValid(newEndTime)) endTime = newEndTime;

    this.setState(
      {
        selectedEndTime: endTime,
        endTimeInputErrorMessage: "",
      },
      () => {
        this.#validateParameters(
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#enableSearch
        );
      }
    );
  };

  handleEndDateChange = (endDate) => {
    this.updateStateForTimeOrDateChange(endDate);
    const newEndTime = this.mergeDateIntoTime(
      endDate,
      this.state.selectedEndTime
    );
    let endTime = this.state.selectedEndTime;
    if (this.isTimeOrDateValid(newEndTime)) endTime = newEndTime;

    this.setState(
      {
        selectedEndDate: endDate,
        selectedEndTime: endTime,
        endDateInputErrorMessage: "",
      },
      () => {
        this.#validateParameters(
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#enableSearch
        );
      }
    );
  };

  handleStopAreaChange = (event) => {
    const { stopPoint, isPolygonActive, isRectangleActive } = this.state;

    this.setState({
      stopArea: event.target.value,
      searchErrorMessage: "",
    });

    if (
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
    const { searchErrorMessage, stopArea, isPolygonActive, isRectangleActive } =
      this.state;

    this.setState({
      stopPoint: event.target.value,
      searchErrorMessage: event.target.value ? searchErrorMessage : "",
    });

    if (
      (isPolygonActive || isRectangleActive) &&
      event.target.value &&
      !stopArea
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
      : "Fel värde på tekniskt nr";

    this.setState(
      {
        internalLineNumber: event.target.value,
        internalLineErrorMessage: validationMessage,
      },
      () => {
        this.#validateParameters(
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#disableSearch,
          this.#enableSearch
        );
      }
    );
  };

  handlePublicLineNameChange = (event) => {
    this.setState({
      publicLineName: event.target.value,
    });
  };

  reactiveSelectSpatialTool = () => {
    if (this.state.spatialToolsEnabled && this.state.isPolygonActive)
      this.activateSearch("Polygon");
    if (this.state.spatialToolsEnabled && this.state.isRectangleActive)
      this.activateSearch("Box");
  };

  updateStateForTimeOrDateChange(timeOrDate) {
    if (!this.isTimeOrDateValid(timeOrDate)) {
      this.#disableSearch();
      return;
    }
    if (!this.state.spatialToolsEnabled) this.#enableSearch();
  }

  isTimeOrDateValid = (timeOrDate) => {
    if (!timeOrDate) return false;
    return timeOrDate.toString() !== "Invalid Date";
  };

  mergeDateIntoTime = (date, time) => {
    if (!this.isTimeOrDateValid(date)) return date;
    if (!this.isTimeOrDateValid(time)) return time;

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      0,
      0
    );
  };

  #disableSearch = () => {
    this.setState(
      { spatialToolsEnabled: false, searchButtonEnabled: false },
      this.deactivateSearch
    );
  };

  #enableSearch = () => {
    this.setState({ spatialToolsEnabled: true, searchButtonEnabled: true });
  };

  #validateParameters = (
    callbackInvalidDate,
    callbackInvalidTime,
    callbackWrongDateAndTime,
    callbackInvalidInernalLineNumber,
    callbackAllIsOK
  ) => {
    const {
      selectedFromDate,
      selectedEndDate,
      selectedEndTime,
      selectedFromTime,
      internalLineErrorMessage,
    } = this.state;

    if (
      !this.isTimeOrDateValid(selectedFromDate) ||
      !this.isTimeOrDateValid(selectedEndDate)
    )
      return callbackInvalidDate();

    if (
      !this.isTimeOrDateValid(selectedFromTime) ||
      !this.isTimeOrDateValid(selectedEndTime)
    )
      return callbackInvalidTime();

    const dateAndTimeValues = this.getFormattedDate();
    if (dateAndTimeValues.formatFromDate > dateAndTimeValues.formatEndDate)
      return callbackWrongDateAndTime();

    if (internalLineErrorMessage) return callbackInvalidInernalLineNumber();

    if (callbackAllIsOK) return callbackAllIsOK();
  };

  addOneHourTime = (time) => {
    if (time && !isNaN(time)) {
      let endTime = new Date(time);
      endTime.setHours(time.getHours() + 1);
      this.setState({
        selectedEndTime: endTime,
        selectedEndDate: endTime,
      });
    }
  };

  getFormattedDate = () => {
    const {
      selectedFromDate,
      selectedEndDate,
      selectedEndTime,
      selectedFromTime,
    } = this.state;
    let fromTime = new Date(selectedFromTime);
    let endTime = new Date(selectedEndTime);

    let formatFromDate = new Date(
      selectedFromDate.getFullYear(),
      selectedFromDate.getMonth(),
      selectedFromDate.getDate(),
      fromTime.getHours(),
      fromTime.getMinutes() - fromTime.getTimezoneOffset(),
      fromTime.getSeconds()
    ).toISOString();

    let formatEndDate = new Date(
      selectedEndDate.getFullYear(),
      selectedEndDate.getMonth(),
      selectedEndDate.getDate(),
      endTime.getHours(),
      endTime.getMinutes() - endTime.getTimezoneOffset(),
      endTime.getSeconds()
    ).toISOString();

    var result = {
      formatFromDate: formatFromDate,
      formatEndDate: formatEndDate,
    };

    return result;
  };

  inactivateSpatialSearchButtons = () => {
    this.setState({ isPolygonActive: false, isRectangleActive: false });
  };

  handlePolygonClick = () => {
    if (!this.state.spatialToolsEnabled) return;
    this.deactivateSearch();

    let validationErrorMessage = this.validateSearchForm();
    if (validationErrorMessage) {
      this.setState({
        searchErrorMessage: validationErrorMessage,
        isPolygonActive: false,
      });
      return;
    }

    this.setState(
      {
        isPolygonActive: !this.state.isPolygonActive,
        isRectangleActive: false,
      },
      () => {
        if (this.state.isPolygonActive) {
          this.activateSearch("Polygon");
        }
      }
    );
    if (this.state.isPolygonActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
  };

  handleRectangleClick = () => {
    if (!this.state.spatialToolsEnabled) return;

    this.deactivateSearch();

    let validationErrorMessage = this.validateSearchForm();
    if (validationErrorMessage) {
      this.setState({
        searchErrorMessage: validationErrorMessage,
        isRectangleActive: false,
      });
      return;
    }

    this.setState(
      {
        isRectangleActive: !this.state.isRectangleActive,
        isPolygonActive: false,
      },
      () => {
        if (this.state.isRectangleActive) {
          this.activateSearch("Box");
        }
      }
    );
    if (this.state.isRectangleActive) {
      this.localObserver.publish("vt-activate-search", () => {});
    }
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
  };

  deactivateSearch = () => {
    this.localObserver.publish("vt-activate-search", () => {});
  };

  activateSearch = (spatialType) => {
    const { publicLineName, internalLineNumber, stopArea, stopPoint } =
      this.state;
    const { formatFromDate, formatEndDate } = this.getFormattedDate();

    let checkedInternalLineNumber =
      removeTralingCommasFromCommaSeparatedString(internalLineNumber);
    this.localObserver.publish("vt-journeys-search", {
      publicLine: publicLineName,
      internalLineNumber: checkedInternalLineNumber,
      stopArea: stopArea,
      stopPoint: stopPoint,
      selectedFromDate: formatFromDate,
      selectedEndDate: formatEndDate,
      selectedFormType: spatialType,
      searchCallback: this.inactivateSpatialSearchButtons,
    });
  };

  disableDrag = () => {
    this.localObserver.publish("vtsearch-dragging-enabled", false);
  };

  enableDrag = () => {
    this.localObserver.publish("vtsearch-dragging-enabled", true);
  };

  setFromTimeInputErrorMessage = (error) => {
    if (error === "invalidDate") {
      this.setState({
        fromTimeInputErrorMessage: "FEL VÄRDE PÅ TID",
      });
      return;
    }

    this.setState({
      inputErrorMessage: "",
    });
  };

  setEndTimeInputErrorMessage = (error) => {
    if (error === "invalidDate") {
      this.setState({
        endTimeInputErrorMessage: "FEL VÄRDE PÅ TID",
      });
      return;
    }

    this.setState({
      inputErrorMessage: "",
    });
  };

  setFromDateInputErrorMessage = (error) => {
    if (error === "invalidDate") {
      this.setState({
        fromDateInputErrorMessage: "FEL VÄRDE PÅ DATUM",
      });
      return;
    }

    this.setState({
      inputErrorMessage: "",
    });
  };

  setEndDateInputErrorMessage = (error) => {
    if (error === "invalidDate") {
      this.setState({
        endDateInputErrorMessage: "FEL VÄRDE PÅ DATUM",
      });
      return;
    }

    this.setState({
      inputErrorMessage: "",
    });
  };

  renderFromDateSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">FRÅN OCH MED</Typography>
          <StyledTimePicker
            format="HH:mm"
            id="time-picker"
            ampm={false}
            value={this.state.selectedFromTime}
            onChange={this.handleFromTimeChange}
            onOpen={this.disableDrag}
            onClose={this.enableDrag}
            onError={(newError) => this.setFromTimeInputErrorMessage(newError)}
            slotProps={{
              textField: {
                variant: "standard",
                helperText: this.state.fromTimeInputErrorMessage,
              },
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <StyledDatePicker
            format="yyyy-MM-dd"
            value={this.state.selectedFromDate}
            onChange={this.handleFromDateChange}
            onOpen={this.disableDrag}
            onClose={this.enableDrag}
            onError={(newError) => this.setFromDateInputErrorMessage(newError)}
            slotProps={{
              textField: {
                variant: "standard",
                helperText: this.state.fromDateInputErrorMessage,
              },
            }}
          />
        </Grid>
      </>
    );
  };

  renderEndDateSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">TILL OCH MED</Typography>
          <StyledTimePicker
            format="HH:mm"
            ampm={false}
            value={this.state.selectedEndTime}
            onChange={this.handleEndTimeChange}
            onOpen={this.disableDrag}
            onClose={this.enableDrag}
            onError={(newError) => this.setEndTimeInputErrorMessage(newError)}
            slotProps={{
              textField: {
                variant: "standard",
                helperText: this.state.endTimeInputErrorMessage,
              },
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <StyledDatePicker
            format="yyyy-MM-dd"
            value={this.state.selectedEndDate}
            onChange={this.handleEndDateChange}
            onOpen={this.disableDrag}
            onClose={this.enableDrag}
            onError={(newError) => this.setEndDateInputErrorMessage(newError)}
            slotProps={{
              textField: {
                variant: "standard",
                helperText: this.state.endDateInputErrorMessage,
              },
            }}
          />
        </Grid>
      </>
    );
  };

  validateSearchForm = () => {
    const { stopArea, stopPoint } = this.state;
    if (stopPoint && !stopArea)
      return "DET GÅR INTE ATT SÖKA PÅ HÅLLPLATSLÄGE UTAN ATT HA FYLLT I HÅLLPLATSNAMN ELLER NUMMER.";

    return "";
  };

  showSearchErrorMessage = () => {
    const { searchErrorMessage } = this.state;

    if (searchErrorMessage) return this.renderErrorMessage(searchErrorMessage);

    return this.renderNoErrorMessage();
  };

  #showValidateParametersErrorMessage = () => {
    return this.#validateParameters(
      this.renderErrorMessageInvalidDate,
      this.renderErrorMessageInvalidTime,
      this.renderErrorMessageStartTimeBiggerThanEndTime,
      this.#renderErrorMessageInvalidInternalLine,
      this.renderNoErrorMessage
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

  renderErrorMessageInvalidDate = () => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          DATUM MÅSTE ANGES
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  renderErrorMessageInvalidTime = () => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          KLOCKSLAG MÅSTE ANGES
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  renderErrorMessageStartTimeBiggerThanEndTime = () => {
    return (
      <Grid item xs={12}>
        <StyledErrorMessageTypography variant="body2">
          TILL OCH MED FÅR INTE VARA MINDRE ÄN FRÅN OCH MED
        </StyledErrorMessageTypography>
      </Grid>
    );
  };

  renderNoErrorMessage = () => {
    return <Typography></Typography>;
  };

  renderStopAreaStopPointSection = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography variant="caption">HÅLLPLATSNAMN ELLER -NR</Typography>
          <TextField
            fullWidth
            id="standard-helperText"
            value={this.state.stopArea}
            onChange={this.handleStopAreaChange}
            error={!(this.state.searchErrorMessage === "")}
            variant="standard"
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption">HÅLLPLATSLÄGE</Typography>
          <Tooltip title="Sökning sker på ett eller flera lägen via kommaseparerad lista">
            <TextField
              fullWidth
              id="standard-helperText"
              value={this.state.stopPoint}
              onChange={this.handleStopPointChange}
              variant="standard"
            />
          </Tooltip>
        </Grid>
      </>
    );
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
              error={!(this.state.internalLineErrorMessage === "")}
              helperText={this.state.internalLineErrorMessage}
            />
          </Tooltip>
        </Grid>
      </>
    );
  };

  renderSearchButtonSection = () => {
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
                onClick={this.handlePolygonClick}
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
                onClick={this.handleRectangleClick}
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
          <StyledLocalizationProvider dateAdapter={AdapterDateFns}>
            {this.renderFromDateSection()}
            {this.renderEndDateSection()}
          </StyledLocalizationProvider>
          {this.renderStopAreaStopPointSection()}
          {this.renderPublicAndTechnicalNrSection()}
          {this.renderSearchButtonSection()}
          {this.#showValidateParametersErrorMessage()}
          {this.showSearchErrorMessage()}
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
export default Journeys;

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

const StyledErrorMessageTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const StyledLocalizationProvider = styled(LocalizationProvider)(() => ({
  marginTop: 10,
}));

const StyledTimePicker = styled(TimePicker)(({ theme }) => ({
  marginTop: 0,
  marginBottom: 10,
  width: "99%",
  color: theme.palette.primary.main,
}));

const StyledDatePicker = styled(DatePicker)(() => ({
  marginBottom: 40,
  width: "99%",
}));

const StyledDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const StyledSearchButton = styled(Button)(({ theme }) => ({
  marginTop: 8,
  borderColor: theme.palette.primary.main,
}));

const StyledTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
}));

class Journeys extends React.PureComponent {
  // Initialize state - this is the correct way of doing it nowadays.
  state = {
    spatialToolsEnabled: true,
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
  };

  // propTypes and defaultProps are static properties, declared
  // as high as possible within the component code. They should
  // be immediately visible to other devs reading the file,
  // since they serve as documentation.
  static propTypes = {
    model: PropTypes.object.isRequired,
    app: PropTypes.object.isRequired,
    localObserver: PropTypes.object.isRequired,
    // classes: PropTypes.object.isRequired,
  };

  static defaultProps = {};

  constructor(props) {
    // If you're not using some of properties defined below, remove them from your code.
    // They are shown here for demonstration purposes only.
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
  }

  bindSubscriptions() {
    const { localObserver } = this.props;
    localObserver.subscribe("vtsearch-result-done", () => {
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

    this.clearSearchInputAndButtons();
    this.localObserver.publish("journeys-search", {
      selectedFromDate: formatFromDate,
      selectedEndDate: formatEndDate,
      publicLineName: publicLineName,
      internalLineNumber: internalLineNumber,
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
        this.validateDateAndTime(
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.enablePolygonAndRectangleSearch
        );
        this.reactiveSelectSpatialTool();
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
        this.validateDateAndTime(
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.enablePolygonAndRectangleSearch
        );
        this.reactiveSelectSpatialTool();
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
        this.validateDateAndTime(
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.enablePolygonAndRectangleSearch
        );
        this.reactiveSelectSpatialTool();
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
        this.validateDateAndTime(
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.disablePolygonAndRectangleSearch,
          this.enablePolygonAndRectangleSearch
        );
        this.reactiveSelectSpatialTool();
      }
    );
  };

  handleStopAreaChange = (event) => {
    const { stopPoint, isPolygonActive, isRectangleActive } = this.state;

    let spatialSearchAllowed = true;
    if (stopPoint && !event.target.value) spatialSearchAllowed = false;

    if (!spatialSearchAllowed) this.deactivateSearch();

    this.setState({
      stopArea: event.target.value,
      searchErrorMessage: "",
      isRectangleActive: spatialSearchAllowed ? isRectangleActive : false,
      isPolygonActive: spatialSearchAllowed ? isPolygonActive : false,
    });
  };

  handleStopPointChange = (event) => {
    const { searchErrorMessage, stopArea, isPolygonActive, isRectangleActive } =
      this.state;
    let spatialSearchAllowed = event.target.value && stopArea;

    if (!spatialSearchAllowed) this.deactivateSearch();

    this.setState({
      stopPoint: event.target.value,
      searchErrorMessage: event.target.value ? searchErrorMessage : "",
      isRectangleActive: spatialSearchAllowed ? isRectangleActive : false,
      isPolygonActive: spatialSearchAllowed ? isPolygonActive : false,
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

  reactiveSelectSpatialTool = () => {
    if (this.state.spatialToolsEnabled && this.state.isPolygonActive)
      this.activateSearch("Polygon");
    if (this.state.spatialToolsEnabled && this.state.isRectangleActive)
      this.activateSearch("Box");
  };

  updateStateForTimeOrDateChange(timeOrDate) {
    if (!this.isTimeOrDateValid(timeOrDate)) {
      this.disablePolygonAndRectangleSearch();
      return;
    }
    if (!this.state.spatialToolsEnabled) this.enablePolygonAndRectangleSearch();
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

  disablePolygonAndRectangleSearch = () => {
    this.setState({ spatialToolsEnabled: false }, this.deactivateSearch);
  };

  enablePolygonAndRectangleSearch = () => {
    this.setState({ spatialToolsEnabled: true });
  };

  validateDateAndTime = (
    callbackInvalidDate,
    callbackInvalidTime,
    callbackWrongDateAndTime,
    callbackAllIsOK
  ) => {
    const {
      selectedFromDate,
      selectedEndDate,
      selectedEndTime,
      selectedFromTime,
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
    this.setState(
      {
        isPolygonActive: !this.state.isPolygonActive,
        isRectangleActive: false,
      },
      () => {
        if (this.state.isPolygonActive) {
          let validationErrorMessage = this.validateSearchForm();
          if (validationErrorMessage) {
            this.deactivateSearch();
            this.setState({
              searchErrorMessage: validationErrorMessage,
              isPolygonActive: false,
            });
            return;
          }

          this.activateSearch("Polygon");
        }
      }
    );
    if (this.state.isPolygonActive) {
      this.localObserver.publish("activate-search", () => {});
    }
  };

  handleRectangleClick = () => {
    if (!this.state.spatialToolsEnabled) return;

    this.deactivateSearch();
    this.setState(
      {
        isRectangleActive: !this.state.isRectangleActive,
        isPolygonActive: false,
      },
      () => {
        if (this.state.isRectangleActive) {
          let validationErrorMessage = this.validateSearchForm();
          if (validationErrorMessage) {
            this.deactivateSearch();
            this.setState({
              searchErrorMessage: validationErrorMessage,
              isRectangleActive: false,
            });
            return;
          }

          this.activateSearch("Box");
        }
      }
    );
    if (this.state.isRectangleActive) {
      this.localObserver.publish("activate-search", () => {});
    }
  };

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.doSearch();
    }
  };

  deactivateSearch = () => {
    this.localObserver.publish("deactivate-search");
  };

  activateSearch = (spatialType) => {
    const { publicLineName, internalLineNumber, stopArea, stopPoint } =
      this.state;
    const { formatFromDate, formatEndDate } = this.getFormattedDate();

    this.localObserver.publish("journeys-search", {
      publicLineName: publicLineName,
      internalLineNumber: internalLineNumber,
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
          <Grid>
            <StyledDatePicker
              format="yyyy-MM-dd"
              value={this.state.selectedFromDate}
              onChange={this.handleFromDateChange}
              onOpen={this.disableDrag}
              onClose={this.enableDrag}
              onError={(newError) =>
                this.setFromDateInputErrorMessage(newError)
              }
              slotProps={{
                textField: {
                  variant: "standard",
                  helperText: this.state.fromDateInputErrorMessage,
                },
              }}
            />
          </Grid>
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

  showErrorMessage = () => {
    return this.validateDateAndTime(
      this.renderErrorMessageInvalidDate,
      this.renderErrorMessageInvalidTime,
      this.renderErrorMessageStartTimeBiggerThanEndTime,
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
          <StyledSearchButton onClick={this.doSearch} variant="outlined">
            <StyledTypography>SÖK</StyledTypography>
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
          {this.showErrorMessage()}
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

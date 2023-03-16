import React, { Component } from "react";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
import BorderStyleIcon from "@mui/icons-material/BorderStyle";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import FormatShapesIcon from "@mui/icons-material/FormatShapes";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

const StyledButton = styled(Button)(({ selected, theme }) => ({
  borderTop: `${theme.spacing(0.5)} solid transparent`,
  borderBottom: selected
    ? `${theme.spacing(0.5)} solid ${theme.palette.secondary.main}`
    : `${theme.spacing(0.5)} solid transparent`,
}));

class Toolbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editFeature: undefined,
    };

    this.props.observer.subscribe("feature-to-update-view", (feature) => {
      this.setState({
        editFeature: feature,
      });
    });
  }

  componentWillUnmount() {
    this.props.observer.unsubscribe("feature-to-update-view");
  }

  changeTool(type, geometryType) {
    const { model, activeTool } = this.props;
    if (geometryType && activeTool === geometryType.toLowerCase()) {
      model.deactivateInteraction();
      return;
    }
    if (activeTool === type) {
      model.deactivateInteraction();
      return;
    }
    model.deactivateInteraction();

    switch (type) {
      case "add":
        model.activateInteraction("add", geometryType);
        break;
      case "remove":
        model.activateInteraction("remove");
        break;
      case "modify":
        model.activateInteraction("modify");
        break;
      case "move":
        model.activateInteraction("move");
        break;
      case "addMultipart":
        model.activateInteraction("addMultipart");
        break;
      case "removeMultipart":
        model.activateInteraction("removeMultipart");
        break;
      default:
        break;
    }
  }

  onAddPointClicked() {
    this.props.model.layer.dragLocked = true;
    this.props.toggleActiveTool("point");
    this.changeTool(
      "add",
      this.props.editSource.editMultiPoint ? "MultiPoint" : "Point"
    );
  }

  onAddLineClicked() {
    this.props.model.layer.dragLocked = true;
    this.props.toggleActiveTool("linestring");
    this.changeTool(
      "add",
      this.props.editSource.editMultiLine ? "MultiLineString" : "LineString"
    );
  }

  onAddPolygonClicked() {
    this.props.model.layer.dragLocked = true;
    this.props.toggleActiveTool("polygon");
    this.changeTool(
      "add",
      this.props.editSource.editMultiPolygon ? "MultiPolygon" : "Polygon"
    );
  }

  onAddMultiPartClicked() {
    this.props.model.layer.dragLocked = true;
    this.props.toggleActiveTool("addMultipart");
    this.changeTool("addMultipart");
  }

  onRemoveMultiPartClicked() {
    this.props.model.layer.dragLocked = true;
    this.props.toggleActiveTool("removeMultipart");
    this.changeTool("removeMultipart");
  }

  onRemoveClicked() {
    this.props.toggleActiveTool("remove");
    this.changeTool("remove");
  }

  onModifyClicked() {
    this.props.toggleActiveTool("modify");
    this.changeTool("modify");
  }

  onMoveClicked() {
    this.props.model.layer.dragLocked = false;
    this.props.toggleActiveTool("move");
    this.changeTool("move");
  }

  onPasteFeatureClicked() {
    let mapClipboardFeature = this.props.app.getMapClipboardFeature();
    this.props.onPasteFeature(mapClipboardFeature);
  }

  render() {
    const { editSource, snapOn, model, isClipboardFeature } = this.props;
    const { editFeature } = this.state;

    if (!editSource || editFeature) return null;

    return (
      <Grid container spacing={1}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={snapOn}
                onChange={this.props.toggleSnap}
                disabled={!this.props.activeTool}
              />
            }
            label="Snappa"
          />
        </FormGroup>
        {model.options.pasteFeatureTool === true && (
          <StyledButton
            variant="contained"
            endIcon={<ContentPasteIcon />}
            title="Klistra in objeckt från kartans urklipp"
            disabled={
              !["point", "linestring", "polygon"].includes(
                this.props.activeTool
              ) || !isClipboardFeature === true
            }
            onClick={() => {
              this.onPasteFeatureClicked();
            }}
          >
            Klistra in
          </StyledButton>
        )}
        <Grid item xs={12}>
          <Typography>Lägg till</Typography>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            disabled={!editSource.editPoint && !editSource.editMultiPoint}
            onClick={() => {
              this.onAddPointClicked();
            }}
            selected={this.props.activeTool === "point"}
            type="button"
            title="Lägg till punkt"
          >
            Punkt
            <ScatterPlotIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            disabled={!editSource.editLine && !editSource.editMultiLine}
            onClick={() => {
              this.onAddLineClicked();
            }}
            type="button"
            title="Lägg till linje"
            selected={this.props.activeTool === "linestring"}
          >
            Linje
            <LinearScaleIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            disabled={!editSource.editPolygon && !editSource.editMultiPolygon}
            onClick={() => {
              this.onAddPolygonClicked();
            }}
            type="button"
            title="Lägg till yta"
            selected={this.props.activeTool === "polygon"}
          >
            Yta
            <BorderStyleIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>

        <Grid item xs={12}>
          <Typography>Editera</Typography>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            onClick={() => {
              this.onMoveClicked();
            }}
            type="button"
            title="Flytta geometri"
            selected={this.props.activeTool === "move"}
          >
            Flytta
            <ZoomOutMapIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            onClick={() => {
              this.onRemoveClicked();
            }}
            type="button"
            title="Ta bort geometri"
            selected={this.props.activeTool === "remove"}
          >
            Radera
            <DeleteIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            fullWidth
            onClick={() => {
              this.onModifyClicked();
            }}
            type="button"
            title="Ändra geometri"
            selected={this.props.activeTool === "modify"}
          >
            Ändra
            <FormatShapesIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={6}>
          <StyledButton
            variant="contained"
            fullWidth
            disabled={!editSource.editMultiPolygon}
            onClick={() => {
              this.onAddMultiPartClicked();
            }}
            type="button"
            title="Lägg till delyta"
            selected={this.props.activeTool === "addMultipart"}
          >
            Addera Del
            <AddIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
        <Grid item xs={6}>
          <StyledButton
            variant="contained"
            fullWidth
            disabled={!editSource.editMultiPolygon}
            onClick={() => {
              this.onRemoveMultiPartClicked();
            }}
            type="button"
            title="Ta bort delyta"
            selected={this.props.activeTool === "removeMultipart"}
          >
            Radera Del
            <RemoveIcon sx={{ marginLeft: 1 }} />
          </StyledButton>
        </Grid>
      </Grid>
    );
  }
}

export default Toolbar;

import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
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

const Toolbar = (props) => {
  const { model, observer, activeTool, editSource } = props;
  const [editFeature, setEditFeature] = useState(undefined);

  React.useEffect(() => {
    observer.subscribe("feature-to-update-view", (feature) => {
      setEditFeature(feature);
    });
    return () => {
      observer.unsubscribe("feature-to-update-view");
    };
  }, [observer]);

  useHotkeys("s", () => {
    if (snapToolsAvailable()) {
      props.toggleSnap();
    }
  });
  useHotkeys("t", () => {
    if (snapToolsAvailable()) {
      props.toggleTrace();
    }
  });

  const snapToolsAvailable = () => {
    if (props.activeTool) return true;
    return false;
  };

  const changeTool = (type, geometryType) => {
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
  };

  const onAddPointClicked = () => {
    model.layer.dragLocked = true;
    props.toggleActiveTool("point");
    changeTool("add", props.editSource.editMultiPoint ? "MultiPoint" : "Point");
  };

  const onAddLineClicked = () => {
    model.layer.dragLocked = true;
    props.toggleActiveTool("linestring");
    changeTool(
      "add",
      props.editSource.editMultiLine ? "MultiLineString" : "LineString"
    );
  };

  const onAddPolygonClicked = () => {
    model.layer.dragLocked = true;
    props.toggleActiveTool("polygon");
    changeTool(
      "add",
      props.editSource.editMultiPolygon ? "MultiPolygon" : "Polygon"
    );
  };

  const onAddMultiPartClicked = () => {
    model.layer.dragLocked = true;
    props.toggleActiveTool("addMultipart");
    changeTool("addMultipart");
  };

  const onRemoveMultiPartClicked = () => {
    model.layer.dragLocked = true;
    props.toggleActiveTool("removeMultipart");
    changeTool("removeMultipart");
  };

  const onRemoveClicked = () => {
    props.toggleActiveTool("remove");
    changeTool("remove");
  };

  const onModifyClicked = () => {
    props.toggleActiveTool("modify");
    changeTool("modify");
  };

  const onMoveClicked = () => {
    model.layer.dragLocked = false;
    props.toggleActiveTool("move");
    changeTool("move");
  };

  const onPasteFeatureClicked = () => {
    let mapClipboardFeature = props.app.getMapClipboardFeature();
    props.onPasteFeature(mapClipboardFeature);
  };

  const renderSnappingBar = () => {
    return (
      <>
        <Grid item xs={12}>
          <Typography>Snappa</Typography>
        </Grid>
        <Grid item xs={4}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={props.snapOn}
                  onChange={props.toggleSnap}
                  disabled={!props.activeTool}
                />
              }
              label="Snappa"
            />
          </FormGroup>
        </Grid>
        <Grid item xs={4}>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={props.traceOn}
                  onChange={props.toggleTrace}
                  disabled={!props.activeTool}
                />
              }
              label="Spåra"
            />
          </FormGroup>
        </Grid>
      </>
    );
  };

  const hideToolbar = !editSource || editFeature;

  return hideToolbar ? null : (
    <Grid container spacing={1}>
      {renderSnappingBar()}
      <Grid item xs={12}>
        <Typography>Lägg till</Typography>
      </Grid>
      <Grid item xs={4}>
        <StyledButton
          variant="contained"
          fullWidth
          disabled={!editSource.editPoint && !editSource.editMultiPoint}
          onClick={() => {
            onAddPointClicked();
          }}
          selected={props.activeTool === "point"}
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
            onAddLineClicked();
          }}
          type="button"
          title="Lägg till linje"
          selected={props.activeTool === "linestring"}
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
            onAddPolygonClicked();
          }}
          type="button"
          title="Lägg till yta"
          selected={props.activeTool === "polygon"}
        >
          Yta
          <BorderStyleIcon sx={{ marginLeft: 1 }} />
        </StyledButton>
      </Grid>

      {/* Klistra in button */}
      {model.options.pasteFeatureTool === true && (
        <Grid item xs={4}>
          <StyledButton
            variant="contained"
            endIcon={<ContentPasteIcon />}
            title="Klistra in objeckt från kartans urklipp"
            disabled={
              !["point", "linestring", "polygon"].includes(props.activeTool) ||
              !props.isClipboardFeature === true
            }
            onClick={() => {
              onPasteFeatureClicked();
            }}
          >
            Klistra in
          </StyledButton>
        </Grid>
      )}

      <Grid item xs={12}>
        <Typography>Editera</Typography>
      </Grid>
      <Grid item xs={4}>
        <StyledButton
          variant="contained"
          fullWidth
          onClick={() => {
            onMoveClicked();
          }}
          type="button"
          title="Flytta geometri"
          selected={props.activeTool === "move"}
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
            onRemoveClicked();
          }}
          type="button"
          title="Ta bort geometri"
          selected={props.activeTool === "remove"}
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
            onModifyClicked();
          }}
          type="button"
          title="Ändra geometri"
          selected={props.activeTool === "modify"}
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
            onAddMultiPartClicked();
          }}
          type="button"
          title="Lägg till delyta"
          selected={props.activeTool === "addMultipart"}
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
            onRemoveMultiPartClicked();
          }}
          type="button"
          title="Ta bort delyta"
          selected={props.activeTool === "removeMultipart"}
        >
          Radera Del
          <RemoveIcon sx={{ marginLeft: 1 }} />
        </StyledButton>
      </Grid>
    </Grid>
  );
};

export default Toolbar;

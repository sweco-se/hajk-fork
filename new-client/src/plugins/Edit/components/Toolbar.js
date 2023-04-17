import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
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
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import { FormControl } from "@mui/material";

const StyledButton = styled(Button)(({ selected, theme }) => ({
  borderTop: `${theme.spacing(0.5)} solid transparent`,
  borderBottom: selected
    ? `${theme.spacing(0.5)} solid ${theme.palette.secondary.main}`
    : `${theme.spacing(0.5)} solid transparent`,
}));

const Toolbar = (props) => {
  const { model, observer, activeTool, editSource } = props;
  const [editFeature, setEditFeature] = useState(undefined);
  const [activeSnapLayers, setActiveSnapLayers] = useState([
    editSource?.id || [],
  ]);

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
  useHotkeys("esc", () => {
    if (model.draw) {
      model.draw.abortDrawing();
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

  const handleSnapLayerSelect = (values) => {
    setActiveSnapLayers(values);
    const chosenLayers = [];
    values.forEach((v) => {
      //The current editing layer may not be under snapSources, but should still be snappable.
      if (v === props.editSource.id) {
        chosenLayers.push(props.editSource);
      } else {
        chosenLayers.push(
          props.model.snapSources.find((source) => source.id === v)
        );
      }
    });
    props.model.changeSnapLayers(chosenLayers);
  };

  const getSnapLayerDisplayNames = (selectedIds) => {
    if (selectedIds.length === 0) {
      return ["Inga lager valda"];
    }

    const displayNames = [];
    selectedIds.forEach((id) => {
      if (id === editSource.id) {
        displayNames.push("Nuvarande Redigeringslager");
      } else {
        const source = props.model.snapSources.find(
          (source) => source.id === id
        );
        displayNames.push(source.caption);
      }
    });
    return displayNames;
  };

  const renderSnappingBar = () => {
    const snapSources = props.model.snapSources;
    return (
      <>
        <Grid item xs={12}>
          <Typography>Snappa</Typography>
        </Grid>
        <Grid container>
          <Grid item xs={12}>
            <Box sx={{ display: "flex" }}>
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
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
              </Box>
              <Box sx={{ display: "flex" }}>
                <FormGroup>
                  <FormControl sx={{ m: 0, maxWidth: 230 }}>
                    <Select
                      multiple={true}
                      autoWidth={false}
                      labelId="snap-layer-select-label"
                      id="snap-layer-select"
                      value={activeSnapLayers}
                      size="small"
                      label={"Snaplager"}
                      onChange={(e) => handleSnapLayerSelect(e.target.value)}
                      disabled={!props.snapOn}
                      displayEmpty
                      renderValue={(selected) => {
                        let displayNames = getSnapLayerDisplayNames(selected);
                        return displayNames.join(", ");
                      }}
                    >
                      <MenuItem value={editSource.id}>
                        <Checkbox
                          checked={activeSnapLayers.includes(editSource.id)}
                        />
                        <Typography>Nuvarande redigeringslager</Typography>
                      </MenuItem>
                      {snapSources.map((source) => {
                        return (
                          <MenuItem key={source.id} value={source.id}>
                            <Checkbox
                              checked={activeSnapLayers.includes(source.id)}
                            />
                            <Typography>{source.caption}</Typography>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </FormGroup>
              </Box>
            </Box>
          </Grid>
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

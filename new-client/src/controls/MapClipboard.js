import * as React from "react";
import { useEffect, useState } from "react";
import { Fab, Box, Paper, Typography, Button } from "@mui/material";

import FileCopyIcon from "@mui/icons-material/FileCopy";

export default function MapClipboard({
  globalObserver,
  showMapClipboard = false,
  appModel,
}) {
  const [clipboardFeature, setClipboardFeature] = useState(null);
  const [open, setOpen] = useState(false);

  const showCopiedFeatureInMap = () => {
    appModel
      .getMap()
      .getView()
      .fit(clipboardFeature.feature.getGeometry().getExtent());
  };

  const renderClipboardSummary = () => {
    if (!open) {
      return <></>;
    }

    const featureType = clipboardFeature.feature.getGeometry().getType();
    const copyDetails = clipboardFeature.copyDetails;

    return (
      <Box sx={{ position: "absolute", bottom: 150, right: 20 }}>
        <Paper sx={{ padding: 2 }}>
          <Typography sx={{ fontWeight: 500 }}>Urklipp objekt:</Typography>
          <Typography>{`Geometrityp: ${featureType}`}</Typography>
          <Typography>{`Ursprunglig lager: ${copyDetails.copiedLayerCaption}`}</Typography>
          <Button
            variant="outlined"
            onClick={() => {
              showCopiedFeatureInMap();
            }}
          >
            Visa i kartan
          </Button>
        </Paper>
      </Box>
    );
  };

  useEffect(() => {
    const clipboardItemChanged = globalObserver.subscribe(
      "core.clipboard-feature-updated",
      () => {
        const clipItem = appModel.getMapClipboardFeature();
        setClipboardFeature(clipItem);
        return () => {
          clipboardItemChanged.unsubscribe();
        };
      }
    );
  }, [globalObserver, appModel]);

  return (
    showMapClipboard && (
      <>
        {renderClipboardSummary()}
        <Fab
          size="small"
          color="primary"
          sx={{ position: "absolute", bottom: 104, right: 20 }} //TODO - properly set positioning.
          disabled={!clipboardFeature}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <FileCopyIcon />
        </Fab>
      </>
    )
  );
}

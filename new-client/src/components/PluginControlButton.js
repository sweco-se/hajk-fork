import React from "react";
import { Button, Paper, Tooltip } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
  paper: {
    marginBottom: theme.spacing(1),
  },
  button: {
    minWidth: "unset",
  },
}));

export default function PluginControlButton({
  icon,
  onClick,
  title,
  abstract,
}) {
  const classes = useStyles();

  return (
    <Tooltip disableInteractive title={`${title}: ${abstract}`}>
      <Paper className={classes.paper}>
        <Button aria-label={title} className={classes.button} onClick={onClick}>
          {icon}
        </Button>
      </Paper>
    </Tooltip>
  );
}

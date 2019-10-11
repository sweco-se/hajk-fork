import React from "react";
import { Button } from "@material-ui/core";
import { useSnackbar } from "notistack";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles(theme => ({
  textButton: {
    color: theme.palette.primary.contrastText,
    marginRight: theme.spacing(1)
  }
}));

/**
 *  *
 * @export
 * @param {*} props
 * @returns React.Component
 */
function CookieNotice({ globalObserver, defaultCookieNoticeMessage }) {
  const classes = useStyles();

  const cookieNoticeMessage =
    defaultCookieNoticeMessage ||
    `Vi använder cookies för att följa upp användandet och ge en bra upplevelse av kartan. Du kan blockera cookies i webbläsaren men då visas detta meddelande igen.`;
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const action = key => (
    <>
      <Button
        onClick={() => {
          window.location =
            "https://webbriktlinjer.se/lagkrav/kaklagen-i-praktiken/";
        }}
        variant="text"
        className={classes.textButton}
      >
        {"Mer information"}
      </Button>
      <Button
        color="primary"
        variant="contained"
        onClick={() => {
          // Set a cookie that ensures that this message won't be shown again
          window.localStorage.setItem("cookieNoticeShown", 1);
          closeSnackbar(key);
        }}
      >
        {"Jag förstår"}
      </Button>
    </>
  );

  // Display only if "cookie" hasn't been set yet
  parseInt(window.localStorage.getItem("cookieNoticeShown")) !== 1 &&
    globalObserver.subscribe("appLoaded", () => {
      enqueueSnackbar(cookieNoticeMessage, {
        persist: true,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "center"
        },
        action: action
      });
    });
  return null;
}

/**
 * The arePropsEqual() function is defined with two parameters:
 * prevProps and nextProps respectively.
 * The arePropsEqual() function returns true when the props are
 * compared to be equal, thereby preventing the component from
 * re-rendering, and returns false when the props are not equal.
 * @param {*} prevProps
 * @param {*} nextProps
 */
function arePropsEqual(prevProps, nextProps) {
  // This ensures that CookieNotice only initiates once
  return true;
}

export default React.memo(CookieNotice, arePropsEqual);

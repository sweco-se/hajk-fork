import React from "react";
import { styled } from "@mui/material/styles";
import TableCell from "@mui/material/TableCell";
import { AutoSizer, Column, Table } from "react-virtualized";
import { SortIndicator } from "react-virtualized";
import "react-virtualized/styles.css";
import { Typography, Tooltip } from "@mui/material";

// const styles = (theme) => ({
//   flexContainer: {
//     display: "flex",
//     alignItems: "center",
//     boxSizing: "border-box",
//   },

//   table: {
//     // temporary right-to-left patch, waiting for
//     // https://github.com/bvaughn/react-virtualized/issues/454
//     "& .ReactVirtualized__Table__headerRow": {
//       flip: false,
//       overflow: "auto",
//       borderBottom: `1px solid ${theme.palette.common.black}`,
//       textTransform: "none",
//       padding: theme.spacing(0),
//       paddingRight: theme.direction === "rtl" ? "0px !important" : undefined,
//     },
//   },

//   tableRowHover: {
//     "&:hover": {
//       backgroundColor: theme.palette.grey[200],
//     },
//   },

//   tableRow: {
//     cursor: "pointer",
//     border: `1px solid ${theme.palette.grey[200]}`,
//     whiteSpace: "wrap",
//     outline: "none",
//   },
//   tableRowSelected: {
//     background: theme.palette.primary.main,
//   },
//   headerColumn: {
//     whiteSpace: "pre-wrap",
//     alignItems: "center",
//     boxSizing: "border-box",
//     justifyContent: "flex-start",
//     cursor: "pointer",
//     display: "flex",
//     paddingTop: theme.spacing(0),
//     paddingRight: theme.spacing(0),
//     paddingBottom: theme.spacing(0),
//     minWidth: theme.spacing(0),
//     lineHeight: 1,
//     borderBottom: theme.spacing(0),
//   },
//   columnStyle: {
//     whiteSpace: "pre-wrap",
//     alignItems: "center",
//     boxSizing: "border-box",
//     justifyContent: "center",
//     cursor: "pointer",
//     wordBreak: "break-all",
//     borderBottom: theme.spacing(0),
//   },
//   rowCell: {
//     marginRight: 0,
//     border: "none",
//     borderBottom: 0,
//     textAlign: "center",
//     flex: 1,
//   },
// });

const StyledTable = styled(Table)(({ theme }) => ({
  "& .ReactVirtualized__Table__headerRow": {
    flip: false,
    overflow: "auto",
    borderBottom: `1px solid ${theme.palette.common.black}`,
    textTransform: "none",
    padding: theme.spacing(0),
    paddingRight: theme.direction === "rtl" ? "0px !important" : undefined,
  },
}));

const StyledTableCellForCell = styled(TableCell)(({ theme }) => ({
  marginRight: 0,
  border: "none",
  borderBottom: 0,
  textAlign: "center",
  flex: 1,
}));

const StyledTableCellForHeader = styled(TableCell)(({ theme }) => ({
  whiteSpace: "pre-wrap",
  alignItems: "center",
  boxSizing: "border-box",
  justifyContent: "flex-start",
  cursor: "pointer",
  display: "flex",
  paddingTop: theme.spacing(0),
  paddingRight: theme.spacing(0),
  paddingBottom: theme.spacing(0),
  minWidth: theme.spacing(0),
  lineHeight: 1,
  borderBottom: theme.spacing(0),
}));

// const StyledTableRowBase = styled(Table)(({ theme }) => ({
//   cursor: "pointer",
//   border: `1px solid ${theme.palette.grey[200]}`,
//   whiteSpace: "wrap",
//   outline: "none",
//   display: "flex",
//   alignItems: "center",
//   boxSizing: "border-box",
// }));

// const StyledTableRow = styled(StyledTableRowBase)(({ theme }) => ({
//   "&:hover": {
//     backgroundColor: theme.palette.grey[200],
//   },
// }));

// const StyledTableRowSelected = styled(StyledTableRowBase)(({ theme }) => ({
//   background: theme.palette.primary.main,
// }));

const headerRowIndex = -1;

/**
 * @summary VirtualizedTable is the core class to handle the table used in Attribute Table
 * @description VirtualizedTable uses React Virtualized to render large lists in a smart way to boost performance.
 * @class VirtualizedTable
 * @extends {React.PureComponent}
 */

class VirtualizedTable extends React.PureComponent {
  static defaultProps = {
    headerHeight: 40,
    rowHeight: 30,
    sortable: true,
    selectedRow: headerRowIndex,
  };

  // getRowClassName = ({ index }) => {
  //   const { classes } = this.props;
  //   if (index !== headerRowIndex && this.props.selectedRow.index === index) {
  //     return clsx(
  //       classes.tableRow,
  //       classes.tableRowSelected,
  //       classes.flexContainer
  //     );
  //   }
  //   return (
  //     index !== headerRowIndex &&
  //     clsx(classes.tableRow, classes.tableRowHover, classes.flexContainer)
  //   );
  // };

  getRow(dataKey, index, other) {
    // Forced to use a Column here instead of a styled column because a Table only accepts an object of type Column.
    return (
      dataKey !== "id" && (
        <Column
          key={dataKey}
          headerRenderer={(headerProps) =>
            this.headerRenderer({
              ...headerProps,
              columnIndex: index,
            })
          }
          sx={{
            cursor: "pointer",
            border: "1px solid grey",
            outline: "none",
            whiteSpace: "pre-wrap",
            alignItems: "center",
            boxSizing: "border-box",
            justifyContent: "center",
            wordBreak: "break-all",
            borderBottom: 0,
            "&:hover": {
              backgroundColor: "white",
            },
          }}
          cellRenderer={this.cellRenderer}
          dataKey={dataKey}
          {...other}
        />
      )
    );
  }

  getSelectedRow(dataKey, index, other) {
    // Forced to use a Column here instead of a styled column because a Table only accepts an object of type Column.
    return (
      dataKey !== "id" && (
        <Column
          key={dataKey}
          headerRenderer={(headerProps) =>
            this.headerRenderer({
              ...headerProps,
              columnIndex: index,
            })
          }
          sx={{
            whiteSpace: "pre-wrap",
            alignItems: "center",
            boxSizing: "border-box",
            justifyContent: "center",
            cursor: "pointer",
            wordBreak: "break-all",
            borderBottom: 0,
            background: "red",
          }}
          cellRenderer={this.cellRenderer}
          dataKey={dataKey}
          {...other}
        />
      )
    );
  }

  cellRenderer = ({ cellData, columnIndex, rowData }) => {
    const { columns } = this.props;
    if (cellData == null) {
      return "";
    }

    return (
      <>
        <Tooltip disableInteractive title={cellData}>
          <StyledTableCellForCell
            component="div"
            variant="body"
            align={
              (columnIndex != null && columns[columnIndex].numeric) || false
                ? "right"
                : "left"
            }
          >
            {cellData}
          </StyledTableCellForCell>
        </Tooltip>
      </>
    );
  };

  headerRenderer = ({ label, columnIndex, sortDirection }) => {
    const { columns, sortable } = this.props;

    return (
      <StyledTableCellForHeader
        component="div"
        variant="head"
        align={columns[columnIndex].numeric || false ? "right" : "left"}
      >
        <Typography variant="caption">{label}</Typography>

        {sortable && <SortIndicator sortDirection={sortDirection} />}
      </StyledTableCellForHeader>
    );
  };

  render() {
    const { columns, rowHeight, rowClicked, headerHeight, ...tableProps } =
      this.props;
    return (
      <AutoSizer>
        {({ height, width }) => (
          <StyledTable
            height={height}
            width={width}
            rowHeight={rowHeight}
            headerHeight={headerHeight}
            onRowClick={rowClicked}
            {...tableProps}
          >
            {columns.map(({ dataKey, ...other }, index) => {
              return index !== headerRowIndex &&
                this.props.selectedRow.index === index
                ? this.getRow(dataKey, index, other)
                : this.getSelectedRow(dataKey, index, other);
            })}
          </StyledTable>
        )}
      </AutoSizer>
    );
  }
}

export default VirtualizedTable;

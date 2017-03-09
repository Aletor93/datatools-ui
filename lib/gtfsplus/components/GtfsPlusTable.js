import React, {Component, PropTypes} from 'react'
import { Row, Col, FormControl, Table, Button, Glyphicon, Tooltip, OverlayTrigger } from 'react-bootstrap'

import GtfsSearch from '../../gtfs/components/gtfssearch'

import EditableTextField from '../../common/components/EditableTextField'

const recordsPerPage = 25

export default class GtfsPlusTable extends Component {
  static propTypes = {
    table: PropTypes.object
  }
  constructor (props) {
    super(props)

    this.state = {
      currentPage: 1,
      visibility: 'all'
    }
  }
  componentWillReceiveProps (nextProps) {
    if (this.props.table !== nextProps.table) {
      this.setState({ currentPage: 1 })
    }
  }

  componentDidMount () {
    this.props.newRowsDisplayed(this.getActiveRowData(this.state.currentPage))
  }

  componentDidUpdate () {
    this.props.newRowsDisplayed(this.getActiveRowData(this.state.currentPage))
  }

  getActiveRowData (currentPage) {
    if (!this.props.tableData) return []
    const tableValidation = this.props.validation || []
    if (this.state.visibility === 'validation' && tableValidation.length < 5000) {
      return this.props.tableData
        .filter(record => (tableValidation.find(v => v.rowIndex === record.origRowIndex)))
          .slice((currentPage - 1) * recordsPerPage,
            Math.min(currentPage * recordsPerPage, this.props.tableData.length))
    }
    return this.props.tableData.slice((currentPage - 1) * recordsPerPage,
      Math.min(currentPage * recordsPerPage, this.props.tableData.length))
  }

  render () {
    const table = this.props.table
    const rowData = this.getActiveRowData(this.state.currentPage)

    const getInput = (row, field, currentValue) => {
      switch (field.inputType) {
        case 'TEXT':
        case 'GTFS_TRIP':
        case 'GTFS_FARE':
        case 'GTFS_SERVICE':
        case 'GTFS_ZONE':
          return (
            <EditableTextField
              value={currentValue}
              onChange={(value) => {
                this.props.fieldEdited(table.id, row, field.name, value)
              }}
            />
          )
        case 'DROPDOWN':
          return (
            <FormControl componentClass='select'
              value={currentValue}
              onChange={(evt) => {
                this.props.fieldEdited(table.id, row, field.name, evt.target.value)
              }}
            >
              {field.options.map(option => {
                return <option value={option.value} key={option.value}>
                  {option.text || option.value}
                </option>
              })}
            </FormControl>
          )
        case 'GTFS_ROUTE':
          const routeEntity = this.props.getGtfsEntity('route', currentValue)

          const routeValue = routeEntity
            ? {
              'value': routeEntity.route_id,
              'label': routeEntity.route_short_name
                ? `${routeEntity.route_short_name} - ${routeEntity.route_long_name}`
                : routeEntity.route_long_name
            }
            : null

          return (
            <GtfsSearch
              feeds={[this.props.feedSource]}
              limit={100}
              entities={['routes']}
              minimumInput={1}
              clearable={false}
              onChange={(evt) => {
                this.props.fieldEdited(table.id, row, field.name, evt.route.route_id)
                this.props.gtfsEntitySelected('route', evt.route)
              }}
              value={routeValue}
            />
          )
        case 'GTFS_STOP':
          const stopEntity = this.props.getGtfsEntity('stop', currentValue)
          const stopValue = stopEntity
            ? {'value': stopEntity.stop_id, 'label': stopEntity.stop_name}
            : null

          return (
            <GtfsSearch
              feeds={[this.props.feedSource]}
              limit={100}
              entities={['stops']}
              clearable={false}
              minimumInput={1}
              onChange={(evt) => {
                this.props.fieldEdited(table.id, row, field.name, evt.stop.stop_id)
                this.props.gtfsEntitySelected('stop', evt.stop)
              }}
              value={stopValue}
            />
          )

      }
    }

    const headerStyle = {
      fontWeight: 'bold',
      fontSize: '24px',
      borderBottom: '2px solid black',
      marginBottom: '16px'
    }

    const subHeaderStyle = {
      marginBottom: '24px',
      textAlign: 'right'
    }

    const colHeaderStyle = {
      background: 'gray',
      borderRight: '4px solid white',
      borderBottom: '0px',
      color: 'white'
    }

    const pageCount = this.props.tableData ? Math.ceil(this.props.tableData.length / recordsPerPage) : 0

    return (<div>
      <Row>
        <Col xs={12}>
          <div style={headerStyle}>
            {table.name}
            <Glyphicon
              glyph='question-sign'
              style={{ cursor: 'pointer', fontSize: '18px', marginLeft: '10px' }}
              onClick={() => {
                this.props.showHelpClicked(table.id)
              }}
            />
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={8}>
          <div className='form-inline'>
            {(pageCount > 1)
              ? <span style={{ marginRight: '15px' }}>
                <Button
                  disabled={this.state.currentPage <= 1}
                  onClick={(evt => {
                    this.setState({ currentPage: this.state.currentPage - 1 })
                  })}
                ><Glyphicon glyph='arrow-left' /></Button>

                <span style={{fontSize: '18px', margin: '0px 10px'}}>
                  Page {this.state.currentPage} of {pageCount}
                </span>

                <Button
                  disabled={this.state.currentPage >= pageCount}
                  onClick={(evt => {
                    this.setState({ currentPage: this.state.currentPage + 1 })
                  })}
                ><Glyphicon glyph='arrow-right' /></Button>

                <span style={{fontSize: '18px', marginLeft: '15px'}}>
                  Go to <FormControl
                    type='text'
                    size={5}
                    style={{ width: '50px', display: 'inline', textAlign: 'center' }}
                    onKeyUp={(e) => {
                      if (e.keyCode === 13) {
                        const newPage = parseInt(e.target.value)
                        if (newPage > 0 && newPage <= pageCount) {
                          e.target.value = ''
                          this.setState({ currentPage: newPage })
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </span>
              </span>
              : null
            }
            <span style={{ fontSize: '18px' }}>
              Show&nbsp;
              <FormControl componentClass='select'
                onChange={(evt) => {
                  console.log('evt', evt.target.value)
                  this.setState({
                    visibility: evt.target.value,
                    currentPage: 1
                  })
                }}
              >
                <option value='all'>All Records</option>
                <option value='validation'>Validation Issues Only</option>
              </FormControl>
            </span>
          </div>
        </Col>

        <Col xs={4} style={subHeaderStyle}>
          <i>Click (?) icon for details on field.<br />Required fields denoted by (*)</i>
        </Col>
      </Row>

      <Table>
        <thead>
          <tr>
            {table.fields.map((field, index) => {
              return (<th style={colHeaderStyle} key={index} className={`col-md-${field.columnWidth}`}>
                {field.name}{field.required ? ' *' : ''}
                <Glyphicon
                  glyph='question-sign'
                  className='pull-right'
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    this.props.showHelpClicked(table.id, field.name)
                  }}
                />
              </th>)
            })}
            <th />
          </tr>
        </thead>
        <tbody>
          {rowData && rowData.length > 0
            ? rowData.map((data, rowIndex) => {
              const tableRowIndex = (this.state.currentPage - 1) * recordsPerPage + rowIndex
              return (
                <tr key={rowIndex}>
                  {table.fields.map(field => {
                    const validationIssue = this.props.validation
                      ? this.props.validation.find(v =>
                          (v.rowIndex === data.origRowIndex && v.fieldName === field.name))
                      : null

                    const tooltip = validationIssue ? (
                      <Tooltip>{validationIssue.description}</Tooltip>
                    ) : null

                    return (
                      <td key={field.name}>
                        {validationIssue
                          ? <div style={{ float: 'left' }}>
                            <OverlayTrigger placement='top' overlay={tooltip}>
                              <Glyphicon glyph='alert' style={{ color: 'red', marginTop: '4px' }} />
                            </OverlayTrigger>
                          </div>
                          : null
                        }
                        <div style={{ marginLeft: (validationIssue ? '20px' : '0px') }}>
                          {getInput(tableRowIndex, field, data[field.name])}
                        </div>
                      </td>
                    )
                  })}
                  <td>
                    <Button
                      bsStyle='danger'
                      bsSize='small'
                      className='pull-right'
                      onClick={() => { this.props.deleteRowClicked(table.id, rowIndex) }}
                    >
                      <Glyphicon glyph='remove' />
                    </Button>
                  </td>
                </tr>
              )
            })
            : null
          }
        </tbody>
      </Table>

      {!rowData || rowData.length === 0
        ? <Row><Col xs={12}>
          <i>No entries exist for this table.</i>
        </Col></Row>
        : null
      }

      <Row>
        <Button
          bsStyle='primary'
          bsSize='large'
          className='pull-right'
          onClick={() => {
            this.props.newRowClicked(table.id)
          }}
        ><Glyphicon glyph='plus' /> New Row</Button>
      </Row>

    </div>)
  }
}

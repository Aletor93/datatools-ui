// @flow

import Icon from '@conveyal/woonerf/components/icon'
import clone from 'lodash/cloneDeep'
import React, { Component } from 'react'
import {connect} from 'react-redux'
import { DragSource, DropTarget } from 'react-dnd'
import {
  Checkbox,
  Col,
  Collapse,
  ControlLabel,
  FormControl,
  FormGroup,
  Row
} from 'react-bootstrap'
import Select from 'react-select'

import * as activeActions from '../../actions/active'
import * as stopStrategiesActions from '../../actions/map/stopStrategies'
import * as tripPatternActions from '../../actions/tripPattern'
import { getEntityName, getAbbreviatedStopName, getTableById } from '../../util/gtfs'
import MinuteSecondInput from '../MinuteSecondInput'
import { getGtfsSpecField } from '../../../common/util/config'
import type { Feed, Pattern, PatternHalt } from '../../../types'
import type {AppState, RouterProps, EditorTables} from '../../../types/reducers'
import { mergePatternHaltsOfPattern } from '../../../gtfs/util'
import { patternHaltIsLocation, patternHaltIsLocationGroup, patternHaltIsStop } from '../../util/location'

import NormalizeStopTimesTip from './NormalizeStopTimesTip'
import PatternStopButtons from './PatternStopButtons'
import PatternHaltIcon from './PatternHaltIcon'

type Props = {
  active: boolean,
  activePattern: Pattern,
  addStopToPattern: typeof stopStrategiesActions.addStopToPattern,
  // property is available through react dnd?
  connectDragSource: any,
  cumulativeTravelTime: number,
  feedSource: Feed,
  findCard: string => { card: PatternHalt, index: number },
  id: string,
  index: number,
  isDragging: boolean,
  moveCard: (string, number) => void,
  patternEdited: boolean,
  patternStop: PatternHalt,
  removeStopFromPattern: typeof stopStrategiesActions.removeStopFromPattern,
  rowStyle: {[string]: number | string},
  saveActiveGtfsEntity: typeof activeActions.saveActiveGtfsEntity,
  setActiveEntity: typeof activeActions.setActiveEntity,
  setActiveStop: typeof tripPatternActions.setActiveStop,
  status: any,
  stop: any,
  stopIsActive: boolean,
  tables: EditorTables,
  updateActiveGtfsEntity: typeof activeActions.updateActiveGtfsEntity,
  updatePatternStops: typeof tripPatternActions.updatePatternStops
}

type PickupDropoffSelectProps = {
  activePattern: Pattern,
  controlLabel: string,
  isFlex?: ?boolean,
  onChange: (evt: SyntheticInputEvent<HTMLInputElement>) => void,
  selectType: string,
  shouldHaveDisabledOption: boolean,
  title: string,
  value: string | number
}

type State = {
  flexDefaultTravelTime: number,
  flexDefaultZoneTime: number,
  initialDwellTime: number,
  initialTravelTime: number,
  meanDurationFactor: number,
  meanDurationOffset: number,
  safeDurationFactor: number,
  safeDurationOffset: number,
  update: boolean
}

const pickupDropoffOptions = [
  {
    value: 0,
    text: 'Regularly Scheduled'
  },
  {
    value: 1,
    text: 'Not available'
  },
  {
    value: 2,
    text: 'Must phone agency to arrange'
  },
  {
    value: 3,
    text: 'Must coordinate with driver to arrange'
  }
]

/** renders the form control drop downs for dropOff/Pick up and also continuous */
const PickupDropoffSelect = (props: PickupDropoffSelectProps) => {
  const {
    activePattern,
    controlLabel,
    isFlex,
    onChange,
    selectType,
    shouldHaveDisabledOption,
    title,
    value
  } = props
  const hasShapeId = activePattern.shapeId === null
  const options = isFlex
    ? pickupDropoffOptions.filter(o => !isFlex || (o.value !== 0 && (selectType === 'dropOffType' || o.value !== 3)))
    : pickupDropoffOptions
  return (
    <FormGroup
      bsSize='small'
      controlId={selectType}
    >
      <ControlLabel
        className='small'
        title={title}
      >
        {controlLabel}
      </ControlLabel>
      <FormControl
        componentClass='select'
        disabled={shouldHaveDisabledOption && hasShapeId}
        onChange={onChange}
        placeholder='select'
        value={value}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.text} ({o.value})</option>
        ))}
      </FormControl>
    </FormGroup>
  )
}

const cardSource = {
  beginDrag (props: Props) {
    return {
      id: props.id,
      originalIndex: props.findCard(props.id).index
    }
  },

  endDrag (props: Props, monitor: any) {
    const { id: droppedId, originalIndex } = monitor.getItem()
    const didDrop = monitor.didDrop()
    if (!didDrop) {
      console.log('endDrag')
      props.moveCard(droppedId, originalIndex)
    }
  },

  // disable dragging if request is pending (i.e., save trip pattern is in progress)
  canDrag (props: Props, monitor: any) {
    if (props.status.savePending || props.active) {
      const item = monitor.getItem()
      // Ensure item exists before getting ID.
      const id = item && item.id
      console.warn(`Cannot drag card (id=${id}). Card is active or save is in progress.`)
      return false
    }
    return true
  }
}

const cardTarget = {
  drop (props, monitor) {
    const { id: droppedId, originalIndex } = monitor.getItem()
    const { index: droppedIndex } = props.findCard(droppedId)
    if (droppedIndex !== originalIndex) {
      props.dropCard()
    }
  },

  hover (props, monitor) {
    const { id: draggedId } = monitor.getItem()
    const { id: overId } = props
    if (draggedId !== overId) {
      const { index: overIndex } = props.findCard(overId)
      props.moveCard(draggedId, overIndex)
    }
  }
}

class PatternStopCard extends Component<Props> {
  _formatTravelTime (cumulativeTravelTime, patternStop) {
    if (!patternStop.defaultTravelTime || !patternStop.defaultDwellTime) return

    // $FlowFixMe Flow can't handle the strange type checking we're doing here
    return `${Math.round(cumulativeTravelTime / 60)} (+${Math.round(patternStop.defaultTravelTime / 60)}${patternStop.defaultDwellTime > 0 ? ` +${Math.round(patternStop.defaultDwellTime / 60)}` : ''})`
  }

  handleClick = () => {
    const {active, id, index, setActiveStop} = this.props
    if (!active) setActiveStop({id, index})
    else setActiveStop({id: null, index: null})
  }

  _onKeyDown = (e) => {
    if (e.keyCode === 13) {
      this.handleClick()
    }
  }

  render () {
    const {
      active,
      connectDragSource,
      // $FlowFixMe https://github.com/flow-typed/flow-typed/issues/1564
      connectDropTarget,
      stop,
      index,
      patternStop,
      cumulativeTravelTime
    } = this.props
    const stopName = getEntityName(stop)
    const abbreviatedStopName = getAbbreviatedStopName(stop)
    const titleStopName = stop
      ? `${index + 1}. ${stopName}`
      : `${index + 1}. [unknown stop]`
    const fullStopName = stop
      ? `${index + 1}. ${abbreviatedStopName}`
      : `${index + 1}. [unknown stop]`

    // Show pattern stop in warning color if travel time is zero (a zero value
    // is required for the first pattern stop).
    let cardBackground = null
    // Flex locations should be their own color
    if (patternHaltIsLocation(patternStop)) {
      cardBackground = 'hsla(187, 84%, 87%, 0.5)'
    }
    if ((!patternStop.defaultTravelTime && !patternStop.flexDefaultTravelTime) && index !== 0) {
      cardBackground = 'hsla(35, 84%, 87%, 1)'
    }
    return connectDragSource(connectDropTarget(
      <div
        className='pattern-stop-card'
        style={{backgroundColor: cardBackground}}>
        {/* Main card title */}
        <div
          className='small'
          role='button'
          style={{cursor: 'pointer'}}
          tabIndex={0}
          onClick={this.handleClick}
          onKeyDown={this._onKeyDown}>
          <div className='pull-left'>
            <p
              style={{margin: '0px'}}
              title={titleStopName}>
              <PatternHaltIcon key={patternStop.id} patternHalt={patternStop} />
              <Icon type={active ? 'caret-down' : 'caret-right'} />
              {fullStopName.length > 25
                ? fullStopName.substr(0, 25) + '…'
                : fullStopName
              }
            </p>
          </div>
          <div className='pull-right'>
            <p style={{margin: '0px'}} className='text-right'>
              <span>
                {this._formatTravelTime(cumulativeTravelTime, patternStop)}
              </span>
              {'    '}
              <span style={{cursor: '-webkit-grab', color: 'black'}} >
                <Icon type='bars' />
              </span>
            </p>
          </div>
          <div className='clearfix' />
        </div>
        <PatternStopContents {...this.props} />
      </div>
    ))
  }
}

/**
 * Whether a pattern halt is a flex location/location group.
 */
function isFlexLocationOrLocationGroup (patternStop: PatternHalt) {
  return !!patternHaltIsLocation(patternStop) || !!patternHaltIsLocationGroup(patternStop)
}

/**
 * Computes a default numerical value if one is not provided.
 */
function numberOrDefault (value: ?number, defaultValue: number) {
  return (value || value === 0) ? value : defaultValue
}

class PatternStopContents extends Component<Props, State> {
  refreshFields (nextProps) {
    const {patternStop} = nextProps || this.props
    // PatternStop will either be a stop or a location
    // This can be detected using the alpahbetically first field

    if (patternHaltIsStop(patternStop)) {
      this.setState({
        // $FlowFixMe flow doesn't like our "type check"
        initialDwellTime: patternStop.defaultDwellTime,
        // $FlowFixMe flow doesn't like our "type check"
        initialTravelTime: patternStop.defaultTravelTime,
        update: false
      })
    } else if (isFlexLocationOrLocationGroup(patternStop)) {
      this.setState({
        // $FlowFixMe flow doesn't like our "type check"
        flexDefaultZoneTime: patternStop.flexDefaultZoneTime,
        // $FlowFixMe flow doesn't like our "type check"
        flexDefaultTravelTime: patternStop.flexDefaultTravelTime,
        // $FlowFixMe flow doesn't like our "type check"
        meanDurationFactor: patternStop.meanDurationFactor,
        // $FlowFixMe flow doesn't like our "type check"
        meanDurationOffset: patternStop.meanDurationOffset,
        // $FlowFixMe flow doesn't like our "type check"
        safeDurationFactor: patternStop.safeDurationFactor,
        // $FlowFixMe flow doesn't like our "type check"
        safeDurationOffset: patternStop.safeDurationOffset,
        update: false
      })
    }
  }

  componentWillMount () {
    this.refreshFields()
  }

  componentWillReceiveProps (nextProps) {
    if (!nextProps.patternEdited && this.props.patternEdited) {
      // FLEX TODO: this isn't quite working, the card needs to be shrunk then expanded
      // The culprit may be that the ID is sometimes mismatched -- note that
      // clicking a flex zone on the map repeatedly sometimes opens the card
      // and sometimes doesn't
      //
      // the Active prop might have to do with this as well?
      this.refreshFields(nextProps)
    }
  }

  /**
   * Only update component if id changes, active state changes, or if pattern has
   * been saved (patternEdited changes to false). This is to ensure that default
   * times are not overwritten.
   * FIXME: id shouldn't change anymore (not generated client-side). Check that
   * this has no negative effects (check elsewhere, too, for example, pattern geom).
   */
  shouldComponentUpdate (nextProps, nextState) {
    if (nextProps.active !== this.props.active ||
      nextProps.id !== this.props.id ||
      nextState !== this.state ||
      (!nextProps.patternEdited && this.props.patternEdited)
    ) {
      return true
    }
    return false
  }

  // Returns combined patternLocations and pattern stops
  getPatternHaltsFromActivePattern = () => {
    return mergePatternHaltsOfPattern(this.props.activePattern)
  };

  _onChangeTimepoint = () => {
    const {activePattern, index, patternStop, saveActiveGtfsEntity, updatePatternStops} = this.props
    const patternStops = this.getPatternHaltsFromActivePattern()
    const newValue = patternStop.timepoint ? 0 : 1
    patternStops[index].timepoint = newValue
    updatePatternStops(activePattern, patternStops)
    saveActiveGtfsEntity('trippattern')
  }

  _onClickRemovePatternStop = () => {
    const {activePattern, index, saveActiveGtfsEntity, updatePatternStops} = this.props
    const patternStops = this.getPatternHaltsFromActivePattern()
    patternStops.splice(index, 1)
    updatePatternStops(activePattern, patternStops)
    saveActiveGtfsEntity('trippattern')
  }

  _onMinuteSecondInputChange = (newValue: number, key: string) => {
    const {activePattern, index, updatePatternStops} = this.props
    const patternStops = this.getPatternHaltsFromActivePattern()
    patternStops[index][key] = newValue
    this.setState({update: true})
    updatePatternStops(activePattern, patternStops)
  }

  _onTextFieldChange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    // FLEX TODO: Validation
    const {activePattern, index, updatePatternStops} = this.props
    // This can also include locations and location groups
    const patternStops = this.getPatternHaltsFromActivePattern()
    patternStops[index][evt.target.id] = evt.target.value
    updatePatternStops(activePattern, patternStops)
  }

  _onPickupOrDropOffChange = (evt: SyntheticInputEvent<HTMLInputElement>) => {
    const selectedOptionValue: number = parseInt(evt.target.value, 10)
    const {activePattern, index, updatePatternStops} = this.props
    const patternStops = this.getPatternHaltsFromActivePattern()

    const newPatternStop = clone(patternStops[index])
    newPatternStop[evt.target.id] = selectedOptionValue
    patternStops[index] = newPatternStop
    this.setState({update: true})
    updatePatternStops(activePattern, patternStops)
  }

  _onBookingRuleChange = (change: {label: string, value: string}, field: string) => {
    const selectedRuleId: string = (change && change.value) || ''
    const {activePattern, index, updatePatternStops} = this.props
    const patternStops = this.getPatternHaltsFromActivePattern()

    const newPatternStop = clone(patternStops[index])
    newPatternStop[field] = selectedRuleId
    patternStops[index] = newPatternStop
    this.setState({update: true})
    updatePatternStops(activePattern, patternStops)
  }

  _renderPickupDropOffTypes = (isFlex: boolean) => {
    const { activePattern, patternStop } = this.props
    // Regular stops have a default pickup/dropoff type of 0 (regularly scheduled stop).
    // Flex stops have a default pickup/dropoff type of 2 (must phone agency).
    const defaultPickupDropOff = isFlex ? 2 : 0
    return (
      <Row>
        <Col xs={6}>
          <PickupDropoffSelect
            activePattern={activePattern}
            controlLabel='Pickup'
            isFlex={isFlex}
            onChange={this._onPickupOrDropOffChange}
            selectType='pickupType'
            shouldHaveDisabledOption={false}
            title='Define the pickup method/availability at this stop.'
            value={numberOrDefault(patternStop.pickupType, defaultPickupDropOff)}
          />
        </Col>
        <Col xs={6}>
          <PickupDropoffSelect
            activePattern={activePattern}
            controlLabel='Drop-off'
            isFlex={isFlex}
            onChange={this._onPickupOrDropOffChange}
            selectType='dropOffType'
            shouldHaveDisabledOption={false}
            title='Define the dropff method/availability at this stop.'
            value={numberOrDefault(patternStop.dropOffType, defaultPickupDropOff)}
          />
        </Col>
      </Row>
    )
  }

  // This entire component should be refactored to use Entity information from gtfs.yml
  // until that refactor happens, it will be a little complex, in line with other
  // similar components.
  // eslint-disable-next-line complexity
  render () {
    const {active, activePattern, feedSource, patternEdited, patternStop, tables} = this.props

    // This component has a special shouldComponentUpdate to ensure that state
    // is not overwritten with new props, so use state.update to check edited
    // state.
    const isEdited = patternEdited || this.state.update

    // FIXME: a better way to do this?
    const pickupBookingRuleId = getGtfsSpecField('stop_time', 'pickup_booking_rule_id')
    const dropOffBookingRuleId = getGtfsSpecField('stop_time', 'drop_off_booking_rule_id')

    const isLocationOrLocationGroup = isFlexLocationOrLocationGroup(patternStop)

    const bookingRuleRow = feedSource.flexUIFeaturesEnabled && (
      <Row>
        <Col xs={6}>
          {pickupBookingRuleId && (
            <FormGroup>
              <ControlLabel className='small'>{pickupBookingRuleId.displayName}</ControlLabel>
              <Select
                clearable
                noResultsText={`No booking rules found. You can add some in the sidebar.`}
                onChange={change => this._onBookingRuleChange(change, 'pickupBookingRuleId')}
                options={getTableById(tables, 'bookingrule').map((rule) => ({
                  label: rule.booking_rule_id,
                  value: rule.booking_rule_id
                }))}
                value={patternStop.pickupBookingRuleId || ''}
              />
            </FormGroup>
          )}
        </Col>
        <Col xs={6}>
          {dropOffBookingRuleId && (
            <FormGroup>
              <ControlLabel className='small'>{dropOffBookingRuleId.displayName}</ControlLabel>
              <Select
                clearable
                noResultsText={`No booking rules found. You can add some in the sidebar.`}
                onChange={change => this._onBookingRuleChange(change, 'dropOffBookingRuleId')}
                options={getTableById(tables, 'bookingrule').map((rule) => ({
                  label: rule.booking_rule_id,
                  value: rule.booking_rule_id
                }))}
                value={patternStop.dropOffBookingRuleId || ''}
              />
            </FormGroup>
          )}
        </Col>
      </Row>
    )

    const stopRows = (
      <div>
        <Row>
          <Col xs={6}>
            <FormGroup controlId='defaultTravelTime' bsSize='small'>
              <ControlLabel
                className='small'
                title={this.props.index === 0
                  ? 'Travel time for first stop must be zero'
                  : 'Define the default time it takes to travel to this stop from the previous stop.'}
              >
                Default travel time
              </ControlLabel>
              <MinuteSecondInput
                disabled={this.props.index === 0}
                onChange={newValue => this._onMinuteSecondInputChange(newValue, 'defaultTravelTime')}
                seconds={this.state.initialTravelTime}
              />
            </FormGroup>
          </Col>
          <Col xs={6}>
            <FormGroup controlId='defaultDwellTime' bsSize='small'>
              <ControlLabel className='small'>Default dwell time</ControlLabel>
              <MinuteSecondInput
                onChange={newValue => this._onMinuteSecondInputChange(newValue, 'defaultDwellTime')}
                seconds={this.state.initialDwellTime}
              />
            </FormGroup>
          </Col>
        </Row>
        {this._renderPickupDropOffTypes(false)}
        <Row>
          <Col xs={6}>
            <PickupDropoffSelect
              activePattern={activePattern}
              controlLabel='Continuous pickup'
              onChange={this._onPickupOrDropOffChange}
              selectType='continuousPickup'
              shouldHaveDisabledOption
              title='Indicates whether a rider can board the transit vehicle anywhere along the vehicle\u2019s travel path.'
              value={numberOrDefault(patternStop.continuousPickup, 1)}
            />
          </Col>
          <Col xs={6}>
            <PickupDropoffSelect
              activePattern={activePattern}
              controlLabel='Continuous drop-off'
              onChange={this._onPickupOrDropOffChange}
              selectType='continuousDropOff'
              shouldHaveDisabledOption
              title='Indicates whether a rider can alight from the transit vehicle at any point along the vehicle\u2019s travel path.'
              value={numberOrDefault(patternStop.continuousDropOff, 1)}
            />
          </Col>
        </Row>
        {feedSource.flexUIFeaturesEnabled && bookingRuleRow}
      </div>
    )

    const locationRows = feedSource.flexUIFeaturesEnabled && (
      <div>
        <Row>
          <Col xs={6}>
            <FormGroup bsSize='small'>
              <ControlLabel className='small'>Default travel time</ControlLabel>
              <MinuteSecondInput
                seconds={this.state.flexDefaultTravelTime}
                onChange={(newValue) => this._onMinuteSecondInputChange(
                  newValue,
                  'flexDefaultTravelTime'
                )}
              />
            </FormGroup>
          </Col>
          <Col xs={6}>
            <FormGroup bsSize='small'>
              <ControlLabel className='small'>Default time in location</ControlLabel>
              <MinuteSecondInput
                seconds={this.state.flexDefaultZoneTime}
                onChange={(newValue) => this._onMinuteSecondInputChange(
                  newValue,
                  'flexDefaultZoneTime'
                )}
              />
            </FormGroup>
          </Col>
        </Row>
        {this._renderPickupDropOffTypes(true)}
        <Row>
          <Col xs={6}>
            <FormGroup controlId='meanDurationFactor'>
              <ControlLabel className='small'>Mean Duration Factor</ControlLabel>
              <FormControl
                value={this.state.meanDurationFactor}
                onChange={this._onTextFieldChange}
                type='number'
              />
            </FormGroup>
          </Col>
          <Col xs={6}>
            <FormGroup controlId='meanDurationOffset'>
              <ControlLabel className='small'>Mean Duration Offset</ControlLabel>
              <FormControl
                value={this.state.meanDurationOffset}
                onChange={this._onTextFieldChange}
                type='number'
              />
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col xs={6}>
            <FormGroup controlId='safeDurationFactor'>
              <ControlLabel className='small'>Safe Duration Factor</ControlLabel>
              <FormControl
                value={this.state.safeDurationFactor}
                onChange={this._onTextFieldChange}
                type='number'
              />
            </FormGroup>
          </Col>
          <Col xs={6}>
            <FormGroup controlId='safeDurationOffset'>
              <ControlLabel className='small'>Safe Duration Offset</ControlLabel>
              <FormControl
                value={this.state.safeDurationOffset}
                onChange={this._onTextFieldChange}
                type='number'
              />
            </FormGroup>
          </Col>
        </Row>
        {bookingRuleRow}
      </div>
    )

    let innerDiv
    if (active) {
      innerDiv = (
        <div>
          <Row>
            <Col xs={4}>
              <Checkbox
                checked={patternStop.timepoint}
                onChange={this._onChangeTimepoint}>
                  Timepoint?
              </Checkbox>
            </Col>
            <Col xs={8}>
              <PatternStopButtons
                {...this.props}
                patternEdited={isEdited}
                size='xsmall'
                style={{ marginTop: '10px' }}
              />
            </Col>
          </Row>
          {patternHaltIsStop(patternStop) && stopRows}
          {isLocationOrLocationGroup && locationRows}
          <NormalizeStopTimesTip />
        </div>
      )
    }
    return (
      <Collapse // collapsible div
        in={active}>
        <div>{innerDiv}</div>
      </Collapse>
    )
  }
}

const dropTargetCollect = (connect) => ({connectDropTarget: connect.dropTarget()})
const dragSourceCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
})

const mapStateToProps = (state: AppState, ownProps: RouterProps) => {
  return { tables: state.editor.data.tables }
}

const mapDispatchToProps = {updateActiveGtfsEntity: activeActions.updateActiveGtfsEntity}

export default DropTarget('card', cardTarget, dropTargetCollect)(
  DragSource('card', cardSource, dragSourceCollect)(connect(mapStateToProps, mapDispatchToProps)(PatternStopCard))
)

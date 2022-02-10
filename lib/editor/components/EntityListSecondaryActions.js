// @flow

import React, {Component} from 'react'
import { Nav, NavItem } from 'react-bootstrap'

import type {Entity, Feed} from '../../types'
import * as activeActions from '../actions/active'

import VirtualizedEntitySelect from './VirtualizedEntitySelect'

type Props = {
  activeComponent: string,
  activeEntity: Entity,
  entities: Array<Entity>,
  feedSource: Feed,
  setActiveEntity: typeof activeActions.setActiveEntity,
  width: number
}

type Option = {
  disabled: boolean,
  label: string,
  value: string
}

export default class EntityListSecondaryActions extends Component<Props> {
  _onChangeEntity = (value: any) => {
    const {activeComponent, feedSource, setActiveEntity} = this.props
    if (!value) {
      setActiveEntity(feedSource.id, activeComponent)
    } else {
      setActiveEntity(feedSource.id, activeComponent, value.entity)
    }
  }

  _onSelectCalendar = () => {
    if (this.props.activeComponent !== 'calendar') {
      this.props.setActiveEntity(this.props.feedSource.id, 'calendar')
    }
  }

  // allow for ellipsis overflow rendering
  _optionRenderer = ({
    focusOption,
    focusedOption,
    key,
    option,
    selectValue,
    style
  }: {
    focusOption: Option => void,
    focusedOption: Option,
    key: string,
    option: Option,
    selectValue: Option => void,
    style: {[string]: number | string}
  }) => {
    const className = ['VirtualizedSelectOption']
    if (option === focusedOption) {
      className.push('VirtualizedSelectFocusedOption')
    }
    if (option.disabled) {
      className.push('VirtualizedSelectDisabledOption')
    }
    const events = option.disabled
      ? {}
      : {
        onClick: () => selectValue(option),
        onMouseOver: () => focusOption(option)
      }
    return (
      <div
        key={key}
        className={className.join(' ')}
        style={{
          cursor: 'pointer',
          ...style
        }}
        {...events}>
        <span
          title={option.label}
          style={{
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            width: this.props.width,
            overflow: 'hidden'
          }}>
          {option.label}
        </span>
      </div>
    )
  }

  _onSelectException = () => {
    if (this.props.activeComponent !== 'scheduleexception') {
      this.props.setActiveEntity(this.props.feedSource.id, 'scheduleexception')
    }
  }

  _onSelectLocation = () => {
    if (this.props.activeComponent !== 'location') {
      this.props.setActiveEntity(this.props.feedSource.id, 'location')
    }
  }

  _onSelectStop = () => {
    if (this.props.activeComponent !== 'stop') {
      this.props.setActiveEntity(this.props.feedSource.id, 'stop')
    }
  }

  render () {
    const {
      activeComponent,
      activeEntity,
      entities,
      feedSource
    } = this.props
    switch (activeComponent) {
      case 'calendar':
      case 'scheduleexception':
        return (
          <Nav
            style={{marginBottom: '5px'}}
            bsStyle='pills'
            justified
            activeKey={activeComponent}>
            <NavItem
              eventKey={'calendar'}
              onClick={this._onSelectCalendar}>
              Calendars
            </NavItem>
            <NavItem
              data-test-id='exception-tab-button'
              eventKey={'scheduleexception'}
              onClick={this._onSelectException}>
              Exceptions
            </NavItem>
          </Nav>
        )
      case 'location':
      case 'route':
      case 'stop':
        return (
        // FIXME[React 16.2+]: Extract into <>...</> markup.
          <div>
            {((activeComponent === 'stop' || activeComponent === 'location') && feedSource && feedSource.flexUIFeaturesEnabled) &&
              <Nav
                style={{marginBottom: '5px'}}
                bsStyle='pills'
                justified
                activeKey={activeComponent}>
                <NavItem
                  eventKey={'stop'}
                  onClick={this._onSelectStop}>
                  Stops
                </NavItem>
                <NavItem
                  data-test-id='exception-tab-button'
                  eventKey={'location'}
                  onClick={this._onSelectLocation}>
                  Locations
                </NavItem>
              </Nav>
            }
            <VirtualizedEntitySelect
              value={activeEntity && activeEntity.id}
              optionRenderer={this._optionRenderer}
              component={activeComponent}
              entities={entities}
              onChange={this._onChangeEntity} />
          </div>
        )
      default:
        return null
    }
  }
}

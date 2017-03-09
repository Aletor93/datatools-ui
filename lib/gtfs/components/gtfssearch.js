import React, { Component, PropTypes } from 'react'
import fetch from 'isomorphic-fetch'
import { Glyphicon, Label } from 'react-bootstrap'
import Select from 'react-select'

import { getFeed, getFeedId } from '../../common/util/modules'

export default class GtfsSearch extends Component {
  static propTypes = {
    value: PropTypes.object
  }
  constructor (props) {
    super(props)
    this.state = {
      value: this.props.value
    }
  }

  cacheOptions (options) {
    options.forEach(o => {
      this.options[o.value] = o.feature
    })
  }

  componentWillReceiveProps (nextProps) {
    if (this.state.value !== nextProps.value && typeof this.props.value !== 'undefined') {
      this.setState({value: nextProps.value})
    }
  }

  renderOption (option) {
    return (
      <span style={{ color: 'black' }}>
        {option.stop
          ? <Glyphicon glyph='map-marker' />
          : <Glyphicon glyph='option-horizontal' />
        } {option.label} <Label>{option.agency ? option.agency.name : ''}</Label> {option.link}
      </span>
    )
  }
  onChange (value) {
    this.props.onChange && this.props.onChange(value)
    this.setState({value})
  }
  render () {
    const getRouteName = (route) => {
      const routeName = route.route_short_name && route.route_long_name
        ? `${route.route_short_name} - ${route.route_long_name}`
        : route.route_long_name
        ? route.route_long_name
        : route.route_short_name
        ? route.route_short_name
        : null
      return routeName
    }
    const getStops = (input) => {
      const feedIds = this.props.feeds.map(getFeedId)
      // console.log(feedIds)
      if (!feedIds.length) return []

      const limit = this.props.limit ? '&limit=' + this.props.limit : ''
      const nameQuery = input ? '&name=' + input : ''
      const url = this.props.filterByRoute ? `/api/manager/stops?route=${this.props.filterByRoute.route_id}&feed=${feedIds.toString()}${limit}` : `/api/manager/stops?feed=${feedIds.toString()}${nameQuery}${limit}`
      return fetch(url)
        .then((response) => {
          return response.json()
        })
        .then((stops) => {
          const stopOptions = stops !== null && stops.length > 0
            ? stops.sort((a, b) => {
              const aStopName = a && a.stop_name && a.stop_name.toLowerCase()
              const bStopName = b && b.stop_name && b.stop_name.toLowerCase()
              if (aStopName.startsWith(input)) {
                return bStopName.startsWith(input) ? aStopName.localeCompare(bStopName) : -1
              } else {
                return bStopName.startsWith(input) ? 1 : aStopName.localeCompare(bStopName)
              }
            }).map(stop => {
              const agency = getFeed(this.props.feeds, stop.feed_id)
              return {
                stop,
                value: stop.stop_id,
                label: `${stop.stop_name} (${stop.stop_id})`,
                agency: agency
              }
            })
            : []
          return stopOptions
        })
        .catch((error) => {
          console.log(error)
          return []
        })
    }
    const getRoutes = (input) => {
      const feedIds = this.props.feeds.map(getFeedId)

      if (!feedIds.length) return []

      // don't need to use limit here
      // const limit = this.props.limit ? '&limit=' + this.props.limit : ''
      const nameQuery = input ? '&name=' + input : ''
      const url = this.props.filterByStop ? `/api/manager/routes?stop=${this.props.filterByStop.stop_id}&feed=${feedIds.toString()}` : `/api/manager/routes?feed=${feedIds.toString()}${nameQuery}`
      return fetch(url)
        .then((response) => {
          return response.json()
        })
        .then((routes) => {
          const routeOptions = routes !== null && routes.length > 0
            ? routes.sort((a, b) => {
              const aRouteName = a && getRouteName(a).toLowerCase()
              const bRouteName = b && getRouteName(b).toLowerCase()
              if (aRouteName.startsWith(input)) {
                return bRouteName.startsWith(input) ? aRouteName.localeCompare(bRouteName) : -1
              } else {
                return bRouteName.startsWith(input) ? 1 : aRouteName.localeCompare(bRouteName)
              }
              // return 0
            }).map(route => (
              {
                route,
                value: route.route_id,
                label: `${getRouteName(route)} (${route.route_id})`,
                agency: getFeed(this.props.feeds, route.feed_id)}
            ))
            : []
          return routeOptions
        })
        .catch((error) => {
          console.log(error)
          return []
        })
    }
    const getOptions = (input) => {
      const entities = typeof this.props.entities !== 'undefined' ? this.props.entities : ['routes', 'stops']
      const entitySearches = []
      if (entities.indexOf('stops') > -1) {
        entitySearches.push(getStops(input))
      }
      if (entities.indexOf('routes') > -1) {
        entitySearches.push(getRoutes(input))
      }
      return Promise.all(entitySearches).then((results) => {
        const stops = results[0]
        const routes = typeof results[1] !== 'undefined' ? results[1] : []
        const options = { options: [...stops, ...routes] }
        // console.log('search options', options)
        return options
      })
    }
    const onFocus = (input) => {
      // clear options to onFocus to ensure only valid route/stop combinations are selected
      this.refs.gtfsSelect.loadOptions('')
    }

    const placeholder = 'Begin typing to search for ' + this.props.entities.join(' or ') + '...'
    return (
      <Select.Async
        ref='gtfsSelect'
        tabIndex={this.props.tabIndex ? this.props.tabIndex : null}
        cache={false}
        onFocus={onFocus}
        filterOptions
        multi={this.props.multi !== null ? this.props.multi : false}
        minimumInput={this.props.minimumInput !== null ? this.props.minimumInput : 1}
        clearable={this.props.clearable}
        placeholder={this.props.placeholder || placeholder}
        loadOptions={getOptions}
        value={this.state.value}
        optionRenderer={this.renderOption}
        onChange={(value) => this.onChange(value)}
      />
    )
  }
}

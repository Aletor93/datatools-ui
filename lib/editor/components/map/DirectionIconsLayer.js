import React, { Component, PropTypes } from 'react'
import bearing from 'turf-bearing'
import { divIcon } from 'leaflet'
import { Marker, FeatureGroup } from 'react-leaflet'
import lineDistance from 'turf-line-distance'
import lineString from 'turf-linestring'
import along from '@turf/along'

export default class DirectionIconsLayer extends Component {
  static propTypes = {
    patternCoordinates: PropTypes.array
  }
  render () {
    // TODO: move this to reducer
    const {editSettings, patternCoordinates, patternSegment, mapState} = this.props
    const {zoom, bounds} = mapState
    // Merge/flattern 2D array of coordinates
    let patternLine
    let patternLength
    const lengthsAlongPattern = []
    try {
      patternLine = patternCoordinates &&
        patternCoordinates.length &&
        lineString([].concat.apply([], patternCoordinates))
      if (!patternLine) return null
      if ((patternSegment || patternSegment === 0) && editSettings.hideInactiveSegments) {
        // Only draw direction icons for single segment if it is active and inactive
        // segments are hidden.
        patternLine = lineString([...patternCoordinates[patternSegment], patternCoordinates[patternSegment + 1]])
      }
      if (!patternLine) return null
      // console.log(patternLine)
      // get intervals along path for arrow icons
      patternLength = patternLine ? lineDistance(patternLine, 'meters') : 0
      const iconInterval = zoom > 15
        ? 200
        : zoom > 14
        ? 500
        : zoom > 12
        ? 2000
        : zoom > 10
        ? 4000
        : zoom > 6
        ? 8000
        : 10000
      for (var i = 0; i < Math.floor(patternLength / iconInterval); i++) {
        const distance = i ? iconInterval * i : iconInterval / 2
        const position = along(patternLine, distance, {units: 'meters'})
        if (!bounds) continue
        if (
          position.geometry.coordinates[1] > bounds.getNorth() ||
          position.geometry.coordinates[1] < bounds.getSouth() ||
          position.geometry.coordinates[0] > bounds.getEast() ||
          position.geometry.coordinates[0] < bounds.getWest()
        ) {
          // Do not render any arrow icons outside of bounds
          continue
        }
        lengthsAlongPattern.push([distance, position])
      }
    } catch (e) {
      console.warn('Could not get line distance to render direction icons', patternLine, e)
      return null
    }
    return (
      <FeatureGroup>
        {lengthsAlongPattern && lengthsAlongPattern.length && patternLine
          ? lengthsAlongPattern.map((length, index) => (
            <DirectionIcon
              index={index}
              length={length}
              key={index}
              patternLine={patternLine} />
          ))
          : null
        }
      </FeatureGroup>
    )
  }
}

class DirectionIcon extends Component {
  render () {
    const {index, length, patternLine} = this.props
    const distance = length[0]
    const position = length[1]

    const nextPosition = along(patternLine, distance + 5, {units: 'meters'})
    const dir = position && nextPosition ? bearing(position, nextPosition) : 0
    const color = '#000'
    const arrowIcon = divIcon({
      html: `<i class="fa fa-arrow-up" style="color: ${color}; transform: rotate(${dir}deg)"></i>`,
      className: ''
    })
    if (!position || !position.geometry || !position.geometry.coordinates) {
      return null
    }
    return (
      <Marker
        position={[position.geometry.coordinates[1], position.geometry.coordinates[0]]}
        icon={arrowIcon}
        key={`directionIcon-${index}`}
        color='black' />
    )
  }
}

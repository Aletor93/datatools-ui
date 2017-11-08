import update from 'react-addons-update'

import { getRouteName } from '../../editor/util/gtfs'

const defaultState = {
  fetchStatus: {
    fetched: false,
    fetching: false,
    error: false
  },
  data: []
}

export default function reducer (state = defaultState, action) {
  switch (action.type) {
    case 'SET_ACTIVE_FEEDVERSION':
      return defaultState
    case 'FETCH_GRAPHQL_ROUTES':
      return {
        fetchStatus: {
          fetched: false,
          fetching: true,
          error: false
        },
        data: []
      }
    case 'FETCH_GRAPHQL_ROUTES_REJECTED':
      return update(state, {
        fetchStatus: {
          $set: {
            fetched: false,
            fetching: false,
            error: true
          }
        }
      })
    case 'FETCH_GRAPHQL_ROUTES_FULFILLED':
      const newRoutes = []
      for (let i = 0; i < action.payload.routes.length; i++) {
        const curRoute = action.payload.routes[i]
        curRoute.route_name = getRouteName(curRoute)
        newRoutes.push(curRoute)
      }
      return {
        fetchStatus: {
          fetched: true,
          fetching: false,
          error: false
        },
        data: newRoutes
      }
    default:
      return state
  }
}

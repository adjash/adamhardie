---
title: React class components to functional components using hooks
author: Adam Hardie
description: "This is a technical discussion, outlining the migration process from a react class based, multi-step booking wizard, which was migrated to a functional component using various multiple new react features, hooks context and more!"
pubDate: 2026-08-11
tags:
  [
    "react",
    "hooks",
    "functional components",
    "class components",
    "context",
    "reducer",
    "state",
  ]
---

Recently in work, I've been working on the migration of a booking funnel, which was written around 8 years ago. In theory, there wasn't anything wrong with this, except there was certain inefficiencies which made it a bit tricky to maintain.

The idea behind this refactoring, is to move from a react class component, handling many, many different responsibilities, to a functional component, using hooks and more modern features of the library, making it easier to maintain.

## Functional component

To migrate from a class component, to a functional class, is in theory an easy switch. However because of the kitchen sink nature of the components here, it was a bit tricker than it probably _should_ have been.

Class components are unable to use hooks, so migrating from the class component to functional component felt to me, like a natural first step. Migrate to a function component, and gradually migrate each of the state management pieces to use hooks.

Firstly, lets go over what our kitchen sink was handling:

### Kitchen sink class component

The entire react app was written with a class based component approach. It was in charge of handling: state management, routing, data fetching, error handling and form validation for various steps in a booking funnel.

Because it handled a lot of these areas, it was a messy component which was hard to reason about and understand. I'm a big fan of things being easy to look at an immediately understand either what it is doing, what is happening, or at least, where to look to figure that out.

Now we've covered what it was handling, lets move onto hooks for state management.

### Hooks and state management

Originally, we had a giant global application state managed throughout the component. This looked something like the following:

```js
constructor(props) {
  this.state = {
    locations: [],
    cost: 0,
    booking: {
      bookingId: "",
      location: "",
      date: "",
      duration: 0,
      email: ""
    },
    errors: [],
    isProcessing: false,
    userCoordinates: ""
    userLocationSearchQuery: "",
    groups: []
  }
}
```

Moving this into using hooks (at least initially), is fairly easy:

```js
const [bookingState, setBookingState] = useState({
    locations: [],
    cost: 0,
    booking: {
      bookingId: "",
      location: "",
      date: "",
      duration: 0,
      email: ""
    },
    errors: [],
    isProcessing: false,
    userCoordinates: ""
    userLocationSearchQuery: "",
    groups: []
})
```

So we've now successfully moved the state initialisation into the `useState()` hook. This means we're going to have to go ahead and update how we actually modify our state.

#### Updating & modifying state

The easiest way (I found) to do this, is just look for `this.setState({...})`, and replace it with `setBookingState({...})`, the hook defined in the previous section.

Something which was common in the codebase, was that we were changing between modifying state directly, and returning an object that 'looks' like the state but isn't, until setting it later on.

I think it would be nice to always update the state directly, making our state the source of truth. It will be slightly exploratory as I'm unsure at this point if there's any big down sides to that. As for now, we'll continue with the original approach and attempt to gradually migrate to direct state updates later.

Its simple enough, things like this:

```js
setLocations(locations) {
  this.setState({
    locations: locations
  });
}
```

Becomes:

```js
const setLocations = (locations) => {
  setBookingState((previousState) => ({
    ...previousState,
    locations: locations,
  }));
};
```

And this needed updated for each of the pieces of booking-state which we had previously across all of the old class functions...

```js
const setLocations = (locations) => {};
const setUserLocations = (location, coordinates) => {};
const resetUserLocation = (userLocationSearchQuery) => {};
```

Some of the functions, such as `setGroups`, used the old-style of `this.setState({}, callback)`, notice the callback is used.

With this new hook approach, we don't/can't do that, and where we have to, we'll introduce a `useEffect` hook to deal with it, it absolutely necessary. But we'll cover that if we had to. I don't think we will at this point.

Since we can do fancy things like spread our previous state into the new, to-be state, we can change the approach slightly, e.g:

```js
setGroups(groups) {
  this.setState(
    {
      groups: groups
    },
    () => {
      if (this.state.booking.group === "")
        this.setSelectedGroup(groups[0].code)
    }
  )
}
```

Becomes:

```js
const setGroups = (groups) => {
  setBookingState((prevBookingState) => ({
    ...prevBookingState,
    groups,
    booking: {
      ...prevBookingState.booking,
      group: prevBookingState.booking.group || groups[0] || null,
    },
  }));
};
```

Notice that we don't need a callback, and we can still conditionally set the new tate to be the first group if there isn't one selected from the previous state already.

Notice that we no longer call `this.setSelectedGroup(groups[0].code)` in the above snippet. This is because, `this.setSelectedGroup(groups[0].code)` originally did `this.state.groups.find((group) => group.code === groups[0].code)`. An unnecessary round trip for setting state. A minor note, but worth mentioning in case you're confused.

---
title: React class components to functional components using hooks
author: Adam Hardie
description: "This is a technical walkthrough, outlining the migration of a legacy React class based booking funnel to a functional component. Covering hooks, state refactoring into slices, and reducers with context as a planned next step."
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

Recently in work, I've been working on the migration of a booking funnel, which was written around 8 years ago. In theory, there wasn't anything wrong with this, except there were certain inefficiencies which made it a bit tricky to maintain.

The idea behind this refactoring, is to move from a react class component, handling many, many different responsibilities, to a functional component, using hooks and more modern features of the library, making it easier to maintain.

## Functional component

To migrate from a class component, to a functional class, is in theory an easy switch. However because of the kitchen sink nature of the components here, it was trickier than it probably _should_ have been.

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
    extras: [],
    isProcessing: false,
    userCoordinates: "",
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
    email: "",
  },
  errors: [],
  extras: [],
  isProcessing: false,
  userCoordinates: "",
  userLocationSearchQuery: "",
  groups: [],
});
```

So we've now successfully moved the state initialisation into the `useState()` hook. This means we're going to have to go ahead and update how we actually modify our state.

#### Updating & modifying state

The easiest way (I found) to do this, is just look for `this.setState({...})`, and replace it with `setBookingState({...})`, the hook defined in the previous section.

Something which was common in the codebase, was that we were changing between modifying state directly, and returning an object that 'looks' like the state but isn't, until setting it later on.

I think it would be nice to always update the state directly, making our state the source of truth. It will be slightly exploratory as I'm unsure at this point if there's any big downsides to that. As for now, we'll continue with the original approach and attempt to gradually migrate to direct state updates later.

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

With this new hook approach, we don't/can't do that, and where we have to, we'll introduce a `useEffect` hook to deal with it, if absolutely necessary. But we'll cover that if we had to. I don't think we will at this point.

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

Notice that we don't need a callback, and we can still conditionally set the new state to be the first group if there isn't one selected from the previous state already.

Notice that we no longer call `this.setSelectedGroup(groups[0].code)` in the above snippet. This is because, `this.setSelectedGroup(groups[0].code)` originally did `this.state.groups.find((group) => group.code === groups[0].code)`. An unnecessary round trip for setting state. A minor note, but worth mentioning in case you're confused.

#### Refactoring state

This giant state object wasn't particularly ideal for being updated. So I wanted to take a stab at refactoring this into smaller state objects, which means we can focus more on just updating the necessary parts of state we need to, instead of updating the global state constantly.

There's business context I won't provide, however to give you a good idea of how this state separation will work. I wanted to steal the idea of state 'slices' from redux here, without actually introducing redux as a dependency.

So the state is going from:

```js
const [bookingState, setBookingState] = useState({
  locations: [],
  cost: 0,
  booking: {
    bookingId: "",
    location: "",
    date: "",
    duration: 0,
    email: "",
  },
  errors: [],
  extras: [],
  isProcessing: false,
  userCoordinates: "",
  userLocationSearchQuery: "",
  groups: [],
});
```

To:

```js
const [booking, setBooking] = useState({
  bookingId: "",
  location: "",
  date: "",
  duration: 0,
  email: "",
  group: null,
});

const [options, setOptions] = useState({
  locations: [],
  groups: [],
  extras: [],
});

const [pricing, setPricing] = useState({
  cost: 0,
  totalSavings: 0,
});

const [ui, setUi] = useState({
  errors: [],
  isProcessing: false,
  userCoordinates: "",
  userLocationSearchQuery: "",
});
```

At first, this looks a bit messy, but I think once we actually start updating our state calls, we'll see the nicety of this approach.

Things like `setBookingState` no longer has to be called everywhere we want to update any piece of state. We just have to call the specific state slice `set<State>`.

E.g:

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

Becomes:

```js
const setGroups = (groups) => {
  setOptions((prevState) => ({ ...prevState, groups }));

  setBooking((prevState) => {
    if (prevState.group === "" || prevState.group === null) {
      return { ...prevState, group: groups[0] };
    }
    return prevState;
  });
};
```

I could be biased, but I think this approach is preferred, primarily because we're explicitly only updating what we need to, instead of having to re-write the big global booking state each time.

With the state slices added, we're able to update specific slices when needed, instead of the entire state/booking object. In theory, this works much better, however we'll see if that actually improves re-render performance. Some areas in this new approach will require multiple `setState` calls, but is clear about what is getting updated when we do.

Next, we'll discuss reducers, how I've used them and why I like them (now that I understand them).

### Reducers

Reducers are a way of consolidating state update logic into a single function. E.g. if we had a `TaskApp`, which holds an array of `tasks` in state, which has three different handlers for `add, remove and edit` tasks.

There's many areas we could probably introduce reducers but to keep this focused, I'll outline the ones which I did, this just so happens to be the new state slices we created.

#### Moving from setting state to dispatching actions.

For `setOptions`, I currently have 3 instances so it should be easy to migrate these.

Our handlers should outline _what to do_ by setting state. We've got it in `setLocations, setGroups and setExtras`.

So in theory, all we have to do is call our dispatch for these, pass the data we want and the type of action we want to take.

Considering that, this is how it works:

`useState` originally:

```js
const [options, setOptions] = useState({
  locations: [],
  groups: [],
  extras: [],
});
```

becomes `useReducer`:

```js
const [options, optionsDispatch] = useReducer(optionsReducer, {
  locations: [],
  groups: [],
  extras: [],
});
```

`useReducer` looks similar to `useState`, but is quite different. Firstly, our `use` statement has to pass a reducer function, and the default state, where as originally it was just the default state.

With this in place, we need to also change how we're updating state, as per the following:

```js
const setLocations = (locations) => {
  optionsDispatch({
    type: "setLocations",
    locations,
  });
};

const setGroups = (groups) => {
  optionsDispatch({
    type: "setGroups",
    groups,
  });
  setBooking((prevState) => {
    if (prevState.group === "" || prevState.group === null) {
      return { ...prevState, group: groups[0] };
    }
    return prevState;
  });
};

const setExtras = (extras) => {
  return optionsDispatch({
    type: "setExtras",
    extras,
  });
};
```

Notice we're calling `optionsDispatch` instead of `setOptions`, which is the second value in the array we declared for the reducer. Secondly, we're also passing a type and the data we actually want to update. The type is the 'what we want to do' and the data is the data we'll apply.

Lastly, we need to create the `optionsReducer` function, which is where optionsDispatch is sent to make the updates requested, so in our example, it's the following:

```js
function optionsReducer(state, action) {
  if (action.type === "setGroups") {
    return {
      locations: state.locations,
      groups: action.groups,
      extras: state.extras,
    };
  }

  if (action.type === "setLocations") {
    return {
      locations: action.locations,
      groups: state.groups,
      extras: state.extras,
    };
  }

  if (action.type === "setExtras") {
    return {
      locations: state.locations,
      groups: state.groups,
      extras: state.extras,
    };
  }
  return state;
}

export default optionsReducer;
```

This was a kind of new approach (to me at least), but what I can see the main benefit of this being, is that we can now extract this reducer function to a different file, and keep our component "lean". We can update our component/app state, outside of the component file itself relatively easily and we can also create tests for the reducer too.

Now, we've successfully moved from using `set<State>`, to creating `useReducer` with custom dispatch functions which will handle each of the different scenarios/types of state updates we're looking to make.

Originally, I wasn't sure if this was overkill, but after working with it for each of the state slices we created, I like the approach. It makes it super clear what action your reducer function is going to actually do because of the type prop. I think it also lends itself to a more easily testable state manipulation. We can just call the reducer functions, passing them state/actions and test the expected output. Nice.

### A foreword on context

So we've now migrated from a class component, to a functional component. From a global `this.state`, to `hooks` via `useState`, and eventually we got to reducers w `useReducer`, which basically lets us consolidate a component state update logic into a single place, or in our case 4 slices.

Context however, lets you pass information deep to other components, without having to explicitly pass it down as a prop. In theory, we can take these reducers, combine it with context and provide the state, and the functions to the context, meaning we don't have to pass them explicitly to the child components, they just have to consume the context provider to get access to the functions/necessary state. However, this requires a much larger project change, and is outside of the scope of this blog post. But I do think that this will be the next natural step in the progression of modernising this booking funnel in work.

Until next time, thanks for reading. Feel free to reach out via email <a href="mailto:adam.hardie13@gmail.com">with any feedback</a>.

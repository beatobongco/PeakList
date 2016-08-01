//initialize fastclick
if ('addEventListener' in document) {
  document.addEventListener('DOMContentLoaded', function() {
    FastClick.attach(document.body);
  }, false);
}

function debug__logout() {
  firebase.auth().signOut()
}

function generateYds() {
  var g = ["5.8", "5.9"]
  var limit = 14
  var current = 10
  var letters = ['a', 'b', 'c', 'd']
  while (current !== limit + 1) {
    for (var i = 0; i < letters.length; i++) {
      g.push("5." + current + letters[i])
    }
    current++
  }
  return g
}

function generateFrench() {
  var g = ["4", "5"]
  var limit = 8
  var current = 6
  var letters = ['a', 'b', 'c']
  while (current !== limit + 1) {
    for (var i = 0; i < letters.length; i++) {
      g.push(current + letters[i])
      g.push(current + letters[i] + "+")
    }
    current++
  }
  return g
}

function initialData() {
  return {
    email: null,
    isConnected: true,
    justRegistered: false,
    userId: null,
    pyramidSides: 38,
    mode: "loading",
    grades: generateFrench(),
    gradingSystem: null,
    requirements: [],
    db: TAFFY(),
    angleChart: null,
  }
}

// Initialize Firebase
var config = {
  apiKey: "AIzaSyCKV-7rSTj_oCjcmieX6QwYcUDo3J7eElA",
  authDomain: "ticklist-fce5a.firebaseapp.com",
  databaseURL: "https://ticklist-fce5a.firebaseio.com",
  storageBucket: "",
}

firebase.initializeApp(config)

var database = firebase.database()

var app = new Vue({
  el: '#tickList',
  data: initialData(),
  computed: {
    routes: function () {
      return _.sortBy(this.db().get(), function(o) { return o.grade })
    },
    angles: function() {
      return [
        {id: "slab", statName: "SLAB", displayName: "Slab", color: "#0face1"},
        {id: "vertical", statName: "VERT", displayName: "Vertical", color: "#ef5728"},
        {id: "slight-overhang", statName: "SLGT", displayName: "Slight overhang (10-20&deg;)", color: "#d2d1b3"},
        {id: "moderate-overhang", statName: "MODR", displayName: "Moderate overhang (30-35&deg;)", color: "#363731"},
        {id: "steep-overhang", statName: "HEVY", displayName: "Heavy overhang (~45&deg;)", color: "#fcea24"},
        {id: "roof", statName: "ROOF", displayName: "Roof", color: "#e2e2e2"}
      ]
    },
    holdTypes: function() {
      return [
        {id: "crimp", statName: "CRIM", displayName: "Crimp", color: "#0face1"},
        {id: "jib", statName: "JIB", displayName: "Jib", color: "#ef5728"},
        {id: "jug", statName: "JUG", displayName: "Jug", color: "#d2d1b3"},
        {id: "mono", statName: "MONO", displayName: "Mono", color: "#363731"},
        {id: "pinch", statName: "PINC", displayName: "Pinch", color: "#fcea24"},
        {id: "pocket", statName: "POCK", displayName: "Pocket", color: "#e2e2e2"},
        {id: "sidepull", statName: "SIDE", displayName: "Sidepull", color: "#e3cb29"},
        {id: "sloper", statName: "SLOP", displayName: "Sloper", color: "#aa231f"},
        {id: "undercling", statName: "UNDR", displayName: "Undercling", color: "#000"}
      ]
    },
  },
  watch: {
    mode: function(value) {
      if (value === "login" || value === "setup") {
        document.querySelector("input[name='username']").focus()
      }
      else if (value === "record") {
        document.querySelector("input[name='routeName']").focus()
      }
    },
    isConnected: function(value) {
      //only back up on reconnect and only if db is not empty
      if (value === true && app.db && app.db().get().length > 0) {
        app.doBackup()
      }
    }
  },
  methods: {
    logout: function(e) {
      e.target.disabled = true
      e.preventDefault()
      //empty state
      firebase.auth().signOut().then(function() {
        app.$data = initialData()
      })
    },
    onGradeFilterChange(e) {
      app.calculateStats(e.target.value)
    },
    changeMode: function(mode, e) {
      if (e) {
        e.preventDefault()
      }
      this.mode = mode
    },
    doLogin: function(e) {
      e.target.disabled = true
      e.preventDefault()
      firebase.auth().signInWithEmailAndPassword(e.target.form.username.value, e.target.form.password.value).catch(function(error) {
        alert(error.message)
      })
    },
    onGradeChange: function(e) {
      if(e.target.value === "yds") {
        this.grades = generateYds()
      }
      else {
        this.grades = generateFrench()
      }
    },
    calculatePyramid: function(onSightLevel) {
      var requirements = []
      var reps = 1
      for (var i = 4; i > 0; i--) {
        //start at top of pyramid
        var base = this.grades[this.grades.indexOf(onSightLevel) + i]
        requirements.push({grade: base, required: reps})
        reps = reps * 2
      }
      return requirements
    },
    firebaseListen() {
      console.log("LISTEN")
      firebase.database().ref("users/" + app.userId).on('value', function(snapshot) {
        //when new data from firebase server received
        console.log("RECEIVED NEW DATA")
        var v = snapshot.val()
        console.log(v)
        app.db = TAFFY(v.data)
        app.requirements = v.requirements

        setTimeout(function() {
          app.calculateStats(document.getElementById("gradeStatSelector").value)
        })

        // for first time
        if (!app.gradingSystem) {
          app.gradingSystem = v.gradingSystem
          if (app.gradingSystem === "yds") {
            app.grades = generateYds()
          }
          else {
            app.grades = generateFrench()
          }
        }
      })
      firebase.database().ref(".info/connected").on("value", function(snap) {
        if (snap.val() === true) {
          app.isConnected = true
        } else {
          app.isConnected = false
        }
      })
    },
    doBackup: function() {
      if (app.isConnected) {
        console.log("BACKUP")
        console.log(app.db().get())
        firebase.database().ref("users/" + app.userId).set({
          gradingSystem: app.gradingSystem,
          requirements: app.requirements,
          data: app.db().get()
        })
      }
    },
    doSetup: function(e) {
      e.target.disabled = true
      e.preventDefault()
      firebase.auth().createUserWithEmailAndPassword(e.target.form.username.value, e.target.form.password.value).catch(function(error) {
        alert(error.message)
        e.target.disabled = false
      })
      app.gradingSystem = e.target.form.gradingSystem.value
      app.requirements = app.calculatePyramid(e.target.form.onsightLevel.value)
      app.justRegistered = true
    },
    checkPyramidComplete: function() {
      var fulfilled = true
      for (var i = 0; i < this.requirements.length; i++) {
        var r = this.requirements[i]
        var numComplete = this.db({grade: r.grade}).count()

        r.completed = numComplete
        this.requirements.$set(i, _.clone(r))
        if (numComplete < r.required) {
          fulfilled = false
        }
      }
      return fulfilled
    },
    calculateStat(stat, chartType, grade, showZeroes) {
      /**
        Stats follow these basic rules
        Define a stat (e.g. angle)
        Canvas element: id must be stat + Chart (angleChart)
        Computed vue value must be stat + 's' (angles)
      **/
      var labels = []
      var colors = []
      var ctx = document.getElementById(stat + "Chart")
      var data = []
      var options = {}

      for (var i = 0; i < app[stat + "s"].length; i++) {
        var curr = app[stat + "s"][i]
        var filter = {}
        filter[stat] = curr.id

        if (grade) {
          filter.grade = grade
        }

        var count = app.db(filter).count()
        if (count > 0 || showZeroes) {
          data.push(count)
          labels.push(curr.statName)
          colors.push(curr.color)
        }
      }
      if (ctx) {
        var c = app[stat + "Chart"]
        if (c) {
          c.data.labels = labels
          c.data.datasets[0].data = data
          c.data.datasets[0].backgroundColor = colors
          c.update()
        }
        else {
          if (chartType === "bar") {
            options = {
              legend: {
                display: false,
              },
              scales: {
                yAxes: [{
                  ticks: {
                    stepSize: 1
                  }
                }]
              }
            }
          }

          app[stat + "Chart"] = new Chart(ctx, {
            type: chartType,
            data: {
              labels: labels,
              datasets: [
                {
                  data: data,
                  backgroundColor: colors
                }]
            },
            options: options,
          })
        }
      }
      console.log(labels)
      console.log(data)
      console.log(colors)
    },
    calculateStats: function(grade) {
      app.calculateStat("angle", "doughnut", grade)
      app.calculateStat("holdType", "bar", grade, true)
    },
    upgradePyramid: function() {
      //find highest grade in req
      var r = this.requirements
      var g = this.grades

      //New tip
      this.requirements.unshift({
        grade: g[g.indexOf(r[0].grade) + 1],
        required: 1
      })
      this.requirements.pop()

      for (var i = 1; i <= 3; i++) {
        var increment = i === 3 ? 4 : i
        this.requirements[i].required = this.requirements[i].required + increment
      }

    },
    recordSend: function(e) {
      console.log("RECORD")
      e.preventDefault()
      var data = $('#sendRecorder').serializeArray().reduce(
        function(obj, item) {
          obj[item.name] = item.value
          return obj
        }, {})

      this.db.insert(data)

      if(app.checkPyramidComplete()) {
        app.upgradePyramid()
      }

      app.doBackup()
      $('#sendRecorder')[0].reset()
    }
  }
})

firebase.auth().onAuthStateChanged(function(user) {
  app.mode = "loading"
  if (user) {
    app.userId = user.uid
    app.email = user.email
    if (app.justRegistered) {
      console.log("JUST REGISTERED")
      app.doBackup()
    }
    app.changeMode("record")
    app.firebaseListen()
  }
  else {
    app.mode = "landing"
  }
})

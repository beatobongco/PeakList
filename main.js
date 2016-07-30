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
  data: {
    justRegistered: false,
    userId: null,
    pyramidSides: 38,
    mode: "loading",
    grades: [],
    requirements: [],
    db: null,
  },
  computed: {
    routes: function () {
      return _.sortBy(this.db().get(), function(o) { return o.grade })
    },
    angles: function() {
      return [
        {id: "slab", statName: "SLAB", displayName: "Slab"},
        {id: "vertical", statName: "VERT", displayName: "Vertical"},
        {id: "slight-overhang", statName: "SLGT", displayName: "Slight overhang (10-20&deg;)"},
        {id: "moderate-overhang", statName: "MODR", displayName: "Moderate overhang (30-35&deg;)"},
        {id: "steep-overhang", statName: "STEE", displayName: "Heavy overhang (~45&deg;)"},
        {id: "roof", statName: "ROOF", displayName: "Roof"}
      ]
    }
  },
  watch: {
    mode: function(value) {
      if (value === "record") {
        app.checkPyramidComplete()
        app.calculateStats()
      }
    }
  },
  ready: function() {
    this.db = TAFFY()
    this.grades = generateFrench()
  },
  methods: {
    logout: function(e) {
      e.preventDefault()
      //empty state
      this.userId = null
      this.db = null
      this.requirements = []
      this.grades = []
      firebase.auth().signOut()
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
        console.log(error)
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
    doBackup: function() {
      console.log(app.db().get())
      firebase.database().ref("users/" + app.userId).set({
        gradingSystem: app.gradingSystem,
        requirements: app.requirements,
        data: app.db().get()
      })
    },
    doRestore: function() {
      firebase.database().ref("users/" + app.userId).on('value', function(snapshot) {
        var v = snapshot.val()
        app.gradingSystem = v.gradingSystem
        app.requirements = v.requirements
        app.db = TAFFY(v.data)
        if (app.gradingSystem === "yds") {
          app.grades = generateYds()
        }
        else {
          app.grades = generateFrench()
        }
        app.mode = "record"
      })
    },
    doSetup: function(e) {
      e.target.disabled = true
      e.preventDefault()
      firebase.auth().createUserWithEmailAndPassword(e.target.form.username.value, e.target.form.password.value).catch(function(error) {
        alert(error.message)
      })
      var onSightLevel = e.target.form.onsightLevel.value
      app.gradingSystem = e.target.form.gradingSystem.value
      app.requirements = app.calculatePyramid(onSightLevel)
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
    calculateStats: function() {
      var labels = _(app.angles).map(a => a.statName).value()
      var ids = _(app.angles).map(a => a.id).value()
      var data = []
      var shouldShow = false
      for (var i = 0; i < ids.length; i++) {
        var count = app.db({angle: ids[i]}).count()
        data.push(count)
        if (count > 0) {
          shouldShow = true
        }
      }

      if (shouldShow) {
        var myDoughnutChart = new Chart(document.getElementById("doughnut"), {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [
            {
              data: data,
              backgroundColor: [
                "#0face1",
                "#ef5728",
                "#d2d1b3",
                "#363731",
                "#fcea24",
                "#e2e2e2"
              ]
            }]
          },
          options: {},
        })
      }
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
      app.calculateStats()
      app.doBackup()
      $('#sendRecorder')[0].reset()
    }
  }
})

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    app.mode = "loading"
    app.userId = user.uid
    if (app.justRegistered) {
      app.mode = "record"
      app.doBackup()
    }
    else {
      app.doRestore()
    }
  }
  else {
    app.mode = "landing"
  }
})

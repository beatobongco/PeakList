//initialize fastclick
if ('addEventListener' in document) {
  document.addEventListener('DOMContentLoaded', function() {
    FastClick.attach(document.body);
  }, false);
}

function debug__logout() {
  firebase.auth().signOut()
}

function debug__anim(anim, anim2) {
  var pc = $('.pyramid-container')
  var animation = "animated " + anim
  pc.addClass(animation)
  pc.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
    if (anim2) {
      pc.removeClass(animation)
      pc.addClass("animated " + anim2)
    }
  })
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

function generateHueco() {
  var g = ["VB"]
  var limit = 17
  var current = 0
  while (current !== limit + 1) {
    g.push("V" + current)
    current++
  }
  return g
}

const DEFAULT_GRADES = generateFrench()
function initialData() {
  return {
    email: null,
    isConnected: true,
    justRegistered: false,
    userId: null,
    mode: "loading",
    selectedGrade: DEFAULT_GRADES[0],
    grades: DEFAULT_GRADES,
    gradingSystem: null,
    requirements: [],
    db: TAFFY(),
    angleChart: null,
    holdTypeChart: null,
    routeWorkChart: null,
    climbType: "route",
    routeOnsight: null,
    boulderOnsight: null,
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
        {id: "slight-overhang", statName: "SLGT", displayName: "Slight overhang (1-15&deg;)", color: "#d2d1b3"},
        {id: "moderate-overhang", statName: "MODR", displayName: "Moderate overhang (15-30&deg;)", color: "#363731"},
        {id: "steep-overhang", statName: "HEVY", displayName: "Heavy overhang (30-60&deg;)", color: "#fcea24"},
        {id: "roof", statName: "ROOF", displayName: "Roof", color: "#e2e2e2"}
      ]
    },
    holdTypes: function() {
      return [
        {id: "crimp", statName: "CRMP", displayName: "Crimp", color: "#0face1"},
        {id: "jib", statName: "JIB", displayName: "Jib", color: "#ef5728"},
        {id: "jug", statName: "JUG", displayName: "Jug", color: "#d2d1b3"},
        {id: "mono", statName: "MONO", displayName: "Mono", color: "#363731"},
        {id: "pinch", statName: "PNCH", displayName: "Pinch", color: "#fcea24"},
        {id: "pocket", statName: "POCK", displayName: "Pocket", color: "#e2e2e2"},
        {id: "sidepull", statName: "SIDE", displayName: "Sidepull", color: "#e3cb29"},
        {id: "sloper", statName: "SLOP", displayName: "Sloper", color: "#aa231f"},
        {id: "undercling", statName: "UNDR", displayName: "Undercling", color: "#000"}
      ]
    },
    routeWorks: function() {
      return [
        {id: "redpoint", statName: "REDP", displayName: "Redpoint", color: "#aa231f"},
        {id: "flash", statName: "FLSH", displayName: "Flash", color: "#e3cb29"},
        {id: "onsight", statName: "ONST", displayName: "On-sight", color: "#0face1"}
      ]
    },
    filterableGrades: function() {
      return this.db().distinct("grade").sort()
    },
    boulderGrades: function() {
      return generateHueco()
    },
    pyramidSides: function() {
      return 38
    },
  },
  watch: {
    mode: function(value) {
      if (value === "login" || value === "setup") {
        document.querySelector("input[name='username']").focus()
      }
      else if (value === "view") {
        this.checkPyramidComplete()
        this.calculateStats()
      }
    },
    isConnected: function(value) {
      //only back up on reconnect and only if db is not empty
      if (value === true && app.db && app.db().get().length > 0) {
        app.doBackup()
      }
    },
    grades: function (value) {
      this.selectedGrade = value[0]
    }
  },
  methods: {
    recordMode() {
      this.changeMode("record")
    },
    changeClimbType(e, type) {
      e.preventDefault()
      app.climbType = type

      firebase.database().ref("users/" + app.userId + "/" + type).once('value', function(snapshot) {
        var v = snapshot.val()
        app.gradingSystem = v.gradingSystem
        app.requirements = v.requirements
        app.db = TAFFY(v.data)

        if (v.gradingSystem === "hueco") {
          app.grades = generateHueco()
        }
        else if (v.gradingSystem === "french") {
          app.grades = generateFrench()
        }
        else if (v.gradingSystem === "yds") {
          app.grades = generateYds()
        }

        app.checkPyramidComplete()
        app.calculateStats()
      })
    },
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
    calculatePyramid: function(onSightLevel, climbType) {
      var requirements = []
      var reps = 1
      var grades = this.grades

      if (climbType === "boulder") {
        grades = generateHueco()
      }
      
      var pyramid = [
        { gradeModifier: 1, required: 1 },
        { gradeModifier: 0, required: 2 }, // onsight level
        { gradeModifier: -1, required: 4 },
        { gradeModifier: -2, required: 8 }
      ]
      var onsightGrade = grades.indexOf(onSightLevel)
      pyramid.forEach(level => {
        var grade = onsightGrade + level.gradeModifier
        if (grade >= 0) {
          requirements.push({ grade: grades[grade], required: level.required })
        }
      })
      return requirements
    },
    firebaseListen() {
      console.log("LISTEN")
      firebase.database().ref("users/" + app.userId).on('value', function(snapshot) {
        //when new data from firebase server received
        console.log("RECEIVED NEW DATA --- MODE: ", app.climbType)
        var v = snapshot.val()
        console.log(v)

        if (app.climbType === "route") {
          console.log("SET ROUTE DATA")
          app.db = TAFFY(v.route.data)
          app.requirements = v.route.requirements
        }
        else if (app.climbType === "boulder") {
          console.log("SET BOULDER DATA")
          app.db = TAFFY(v.boulder.data)
          app.requirements = v.boulder.requirements
        }

        app.checkPyramidComplete()

        var gss = document.getElementById("gradeStatSelector")
        if (gss) {
          app.calculateStats(gss.value)
        }
        else {
          app.calculateStats()
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
        firebase.database().ref("users/" + app.userId + "/" + app.climbType).update({
          requirements: app.requirements,
          data: app.db().get(),
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

      app.routeOnsight = e.target.form.onsightLevel.value
      app.boulderOnsight = e.target.form.boulderOnsight.value
      app.gradingSystem = e.target.form.gradingSystem.value
      app.justRegistered = true
    },
    doInitialBackup() {
      firebase.database().ref("users/" + app.userId + "/route").set({
        gradingSystem: app.gradingSystem,
        requirements: app.calculatePyramid(app.routeOnsight),
      })

      firebase.database().ref("users/" + app.userId + "/boulder").set({
        gradingSystem: "hueco",
        requirements: app.calculatePyramid(app.boulderOnsight, "boulder"),
      })
    },
    checkPyramidComplete: function() {
      console.log("CHECK PYRAMID")
      if (!this.requirements.length) {
        return
      }
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

      if (fulfilled) {
        var pc = $('.pyramid-container')
        var animationOut = "animated bounceOut"
        var animationIn = "animated bounceIn"
        var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend'
        var g = this.grades
        var index = g.indexOf(app.requirements[0].grade)
        console.log(app.requirements[0].grade, index, g.length)
        if (index + 1 >= g.length) {
          console.log("Congratulations, you're a real Sharma!")
          return
        }

        pc.addClass(animationOut)

        pc.one(animationEnd, function() {
          pc.removeClass(animationOut)
          app.upgradePyramid()
          pc.addClass(animationIn)
          pc.one(animationEnd, function() {
            pc.removeClass(animationIn)
            app.checkPyramidComplete()
          })
        })
      }
    },
    calculateStat(stat, chartType, grade, showZeroes) {
      /**
        Stats follow these basic rules
        Define a stat (e.g. angle)
        Put that stat in app.data
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
        if (chartType === "bar") {
          options = {
            legend: {
              display: false,
            },
            scales: {
              yAxes: [{
                ticks: {
                  min: 0,
                  maxTicksLimit: 5,
                  callback: function(value) {
                    if(!(value % 1)) {
                      return Number(value).toFixed(0)
                    }
                  }
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
    },
    calculateStats: function(grade) {
      setTimeout(function(grade) {
        app.calculateStat("angle", "bar", grade, true)
        app.calculateStat("holdType", "bar", grade, true)
        app.calculateStat("routeWork", "doughnut", grade)
      }.bind(this, grade), 200)
    },
    upgradePyramid: function () {
      this.requirements = this.calculatePyramid(this.requirements[0].grade, this.climbType)
      app.doBackup()
    },
    recordSend: function(e) {
      e.preventDefault()
      var data = $('#sendRecorder').serializeArray().reduce(
        function(obj, item) {
          obj[item.name] = item.value
          return obj
        }, {})

      this.db.insert(data)
      app.doBackup()
      // TODO: this causes the v-model for selectedGrade to not work
      $('#sendRecorder')[0].reset()
      this.changeMode("view")
    }
  },
})

firebase.auth().onAuthStateChanged(function(user) {
  app.mode = "loading"
  if (user) {
    app.userId = user.uid
    app.email = user.email
    if (app.justRegistered) {
      console.log("JUST REGISTERED")
      app.doInitialBackup()
      app.justRegistered = false
    }
    app.changeMode("view")
    app.firebaseListen()
  }
  else {
    app.changeMode("landing")
  }
})

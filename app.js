const express = require("express");
const dateModule = require("date-fns/format");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDBAndServer();

const invalidValues = (request, response, next) => {
  const { category, status, priority, date } = request.query;
  const queryObject = { category, status, priority, date };
  const objectKeys = Object.keys(queryObject);
  let nonEmptyValue = [];
  for (let j of objectKeys) {
    if (queryObject[j] !== undefined) {
      nonEmptyValue.push(j);
    }
  }
  const checkValues = {
    category: ["WORK", "HOME", "LEARNING"],
    priority: ["HIGH", "MEDIUM", "LOW"],
    status: ["TO DO", "IN PROGRESS", "DONE"],
    date: function () {
      const date = new Date(queryObject.date);
      let year = date.getFullYear() > 0;
      let weekDay = date.getDate() <= 31 || date.getDate() > 0;
      let month = date.getMonth() <= 12 || date.getMonth() > 0;

      if (year && month && weekDay) {
        const formatDate = dateModule(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          "yyyy-MM-dd"
        );
        request.query["date"] = formatDate;
      } else {
        return "date";
      }
    },
  };

  let arr = [];
  for (let i of nonEmptyValue) {
    let obj = checkValues[i];
    if (i === "date") {
      let value = obj();
      if (value === "date") {
        arr.push(value);
      }
    } else if (obj.includes(queryObject[i]) === false) {
      arr.push(i);
    }
  }
  if (arr.length === 0) {
    next();
  } else {
    let invalidValue = arr[0];
    if (invalidValue === "date") {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.status(400);
      response.send(
        `Invalid Todo ${
          invalidValue[0].toUpperCase() +
          invalidValue.substr(1, invalidValue.length)
        }`
      );
    }
  }
};

//API1 GET METHOD
app.get("/todos/", invalidValues, async (request, response) => {
  const {
    priority = "",
    status = "",
    category = "",
    search_q = "",
  } = request.query;
  const todoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE "%${search_q}%" AND category LIKE "%${category}%" AND priority LIKE "%${priority}%" AND status LIKE "%${status}%";`;
  const dbResponse = await db.all(todoQuery);
  response.send(dbResponse);
});

//API2 GET METHOD
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE id=${todoId};`;
  const dbResponse = await db.get(query);
  response.send(dbResponse);
});

//API3 GET method
app.get("/agenda/", invalidValues, async (request, response) => {
  const { date } = request.query;
  const query = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE due_date='${date}';`;
  const dbResponse = await db.all(query);
  response.send(dbResponse);
});

const invalid = (request, response, next) => {
  const { category, status, priority, dueDate } = request.body;
  const queryObject = { category, status, priority, dueDate };
  const objectKeys = Object.keys(queryObject);
  let nonEmptyValue = [];
  for (let j of objectKeys) {
    if (queryObject[j] !== undefined) {
      nonEmptyValue.push(j);
    }
  }
  const checkValues = {
    category: ["WORK", "HOME", "LEARNING"],
    priority: ["HIGH", "MEDIUM", "LOW"],
    status: ["TO DO", "IN PROGRESS", "DONE"],
    dueDate: function () {
      const date = new Date(queryObject.dueDate);
      let year = date.getFullYear() > 0;
      let weekDay = date.getDate() <= 31 || date.getDate() > 0;
      let month = date.getMonth() <= 12 || date.getMonth() > 0;

      if (year && month && weekDay) {
        const formatDate = dateModule(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          "yyyy-MM-dd"
        );
        queryObject["dueDate"] = formatDate;
      } else {
        return "date";
      }
    },
  };

  let arr = [];
  for (let i of nonEmptyValue) {
    let obj = checkValues[i];
    if (i === "dueDate") {
      let value = obj();
      if (value === "date") {
        arr.push(value);
      }
    } else if (obj.includes(queryObject[i]) === false) {
      arr.push(i);
    }
  }
  if (arr.length === 0) {
    next();
  } else {
    let invalidValue = arr[0];
    if (invalidValue === "date") {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.status(400);
      response.send(
        `Invalid Todo ${
          invalidValue[0].toUpperCase() +
          invalidValue.substr(1, invalidValue.length)
        }`
      );
    }
  }
};

//API4 POST METHOD
app.post("/todos/", invalid, async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const query = `INSERT INTO todo (id,todo,priority,status,category,due_date) VALUES(${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
  const dbResponse = await db.run(query);
  response.send("Todo Successfully Added");
});

//API5 PUT METHOD
app.put("/todos/:todoId/", invalid, async (request, response) => {
  const obj = request.body;
  const key = Object.keys(obj);
  let value = key[0];
  let objValue = obj[value];
  if (value === "dueDate") {
    value = "due_date";
  }
  const { todoId } = request.params;
  const query = `UPDATE todo SET ${value}='${objValue}' WHERE id=${todoId};`;
  const dbResponse = await db.run(query);
  if (value === "due_date") {
    response.send("Due Date Updated");
  } else {
    response.send(
      `${value[0].toUpperCase() + value.substr(1, value.length)} Updated`
    );
  }
});

//API6 DELETE METHOD
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `DELETE FROM todo WHERE id=${todoId};`;
  const dbResponse = await db.run(query);
  response.send("Todo Deleted");
});

module.exports = app;

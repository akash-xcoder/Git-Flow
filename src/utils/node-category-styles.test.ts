import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveNodeCategory,
  getNodeCategoryStyle,
} from "./node-category-styles";

test("getNodeCategoryStyle assigns distinct border colors for api, database, and service", () => {
  const api = getNodeCategoryStyle("api");
  const db = getNodeCategoryStyle("database");
  const service = getNodeCategoryStyle("service");

  assert.equal(api.category, "api");
  assert.match(api.borderClass, /cyan/);
  assert.equal(api.borderHex, "#22d3ee");

  assert.equal(db.category, "database");
  assert.match(db.borderClass, /purple/);
  assert.equal(db.borderHex, "#c084fc");

  assert.equal(service.category, "service");
  assert.match(service.borderClass, /yellow/);
  assert.equal(service.borderHex, "#facc15");

  assert.notEqual(api.borderClass, db.borderClass);
  assert.notEqual(db.borderClass, service.borderClass);
  assert.notEqual(api.borderClass, service.borderClass);
});

test("resolveNodeCategory prioritizes explicit category prop over data.category and normalizes aliases", () => {
  assert.equal(resolveNodeCategory("api", "database"), "api");
  assert.equal(resolveNodeCategory(undefined, " Database "), "database");
  assert.equal(resolveNodeCategory("DB", undefined), "database");
  assert.equal(resolveNodeCategory("worker", undefined), "service");
  assert.equal(resolveNodeCategory("endpoint", undefined), "api");
  assert.equal(resolveNodeCategory("", ""), undefined);
});

test("getNodeCategoryStyle returns neutral default for missing category and distinct styles for pipeline roles", () => {
  const missing = getNodeCategoryStyle(undefined);
  assert.equal(missing.category, "default");
  assert.equal(missing.borderClass, "border-gray-700");

  const source = getNodeCategoryStyle("source");
  const pipeline = getNodeCategoryStyle("pipeline");
  const artifact = getNodeCategoryStyle("artifact");
  const deployment = getNodeCategoryStyle("deployment");

  const classes = new Set([
    source.borderClass,
    pipeline.borderClass,
    artifact.borderClass,
    deployment.borderClass,
  ]);
  assert.equal(classes.size, 4);
});

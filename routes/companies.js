const db = require("../db");
const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");

router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(
      `SELECT code, name, description FROM companies`
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ companies: results.rows });
  } catch (e) {
    return next(e);
  }
});

router.get("/:code", async (req, res, next) => {
  try {
    const results = await db.query(
      `SELECT code, name, description FROM companies WHERE code=$1`,
      [req.params.code]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    const invoices = await db.query(
      `SELECT * FROM invoices WHERE comp_code=$1`,
      [results.rows[0].code]
    );
    return res.json({
      company: { ...results.rows[0], invoices: invoices.rows },
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name)
      throw new ExpressError("Code or Name cannot be null", 400);
    const results = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
      [code, name, description]
    );
    return res.status(201).json({ company: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.put("/:code", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const results = await db.query(
      `UPDATE companies SET name=$1, description=$2 WHERE code=$3 RETURNING code, name, description`,
      [name, description, req.params.code]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ company: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.delete("/:code", async (req, res, next) => {
  try {
    const results = await db.query(
      `DELETE FROM companies WHERE code=$1 RETURNING code, name, description`,
      [req.params.code]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ status: "deleted", company: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

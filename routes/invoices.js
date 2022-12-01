const db = require("../db");
const express = require("express");
const ExpressError = require("../expressError");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM invoices`);
    return res.json({ invocies: results.rows });
  } catch (e) {
    return next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM invoices WHERE id=$1`, [
      req.params.id,
    ]);
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    const companyResult = await db.query(
      `SELECT * FROM companies WHERE code=$1`,
      [results.rows[0].comp_code]
    );
    const company = companyResult.rows[0];
    delete results.rows[0].comp_code;
    return res.json({ inovice: { ...results.rows[0], company } });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;
    if (!comp_code || !amt)
      throw new ExpressError("Company Code or Amount cannot be null", 400);
    const company = await db.query(`SELECT * FROM companies WHERE code=$1`, [
      comp_code,
    ]);
    if (company.rows.length === 0)
      throw new ExpressError("Company Code Not Found", 400);
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING *`,
      [comp_code, amt]
    );
    return res.status(201).json({ invoice: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const results = await db.query(
      `UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING *`,
      [req.body.amt, req.params.id]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ invoice: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const results = await db.query(
      `DELETE FROM invoices WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ status: "deleted", invoice: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

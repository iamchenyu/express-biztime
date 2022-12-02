const express = require("express");
const slugify = require("slugify");
const db = require("../db");
const router = new express.Router();
const ExpressError = require("../expressError");

router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT * FROM industries`);
    return res.json({ industries: results.rows });
  } catch (e) {
    return next(e);
  }
});

router.get("/:code", async (req, res, next) => {
  try {
    const results = await db.query(
      `SELECT i.code, i.industry, c.name FROM industries AS i
    LEFT JOIN industries_companies AS ic ON ic.indu_code = i.code
    LEFT JOIN companies AS c ON ic.comp_code = c.code
    WHERE i.code=$1`,
      [req.params.code]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);

    let { code, industry, name } = results.rows[0];
    if (results.rows.length > 1) {
      name = results.rows.map((entry) => entry.name);
    }

    return res.json({ industry: { code, industry, name } });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, industry, companies } = req.body;
    if (!code || !industry)
      throw new ExpressError("Industry Code or Name cannot be null", 400);
    const slugifiedCode = slugify(code, {
      replacement: "",
      lower: true,
      locale: "en",
    });

    const results = await db.query(
      `INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING code, industry`,
      [slugifiedCode, industry]
    );

    if (companies) {
      companies.map(async (comp) => {
        // pretend companies is an non-empty array and comp code already exists ---> let user choose from a dropdown value
        await db.query(
          `INSERT INTO industries_companies (comp_code, indu_code) VALUES ($1, $2)`,
          [comp, slugifiedCode]
        );
        const results = await db.query(
          `SELECT i.code, i.industry, c.name FROM industries AS i
           LEFT JOIN industries_companies AS ic ON ic.indu_code = i.code
           LEFT JOIN companies AS c ON ic.comp_code = c.code
           WHERE i.code=$1`,
          [slugifiedCode]
        );
        let { code, industry, name: company } = results.rows[0];

        if (results.rows.length > 1) {
          company = results.rows.map((entry) => entry.name);
        }

        return res.status(201).json({ industry: { code, industry, company } });
      });
    } else {
      return res
        .status(201)
        .json({ industry: { ...results.rows[0], company: null } });
    }
  } catch (e) {
    return next(e);
  }
});

router.delete("/:code", async (req, res, next) => {
  try {
    const results = await db.query(
      `DELETE FROM industries WHERE code=$1 RETURNING *`,
      [req.params.code]
    );
    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);
    return res.json({ message: "deleted", industry: results.rows[0] });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

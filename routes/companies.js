const db = require("../db");
const express = require("express");
const slugify = require("slugify");
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
      `SELECT c.code, c.name, c.description, i.industry FROM companies AS c
       LEFT JOIN industries_companies AS ic ON c.code = ic.comp_code
       LEFT JOIN industries AS i ON i.code = ic.indu_code
       WHERE c.code=$1`,
      [req.params.code]
    );

    if (results.rows.length === 0)
      throw new ExpressError("No results found", 404);

    let { code, name, description, industry } = results.rows[0];

    if (results.rows.length > 1) {
      industry = results.rows.map((entry) => entry.industry);
    }

    let invoices = await db.query(`SELECT * FROM invoices WHERE comp_code=$1`, [
      results.rows[0].code,
    ]);
    if (invoices.rows.length === 0) invoices.rows = null;

    return res.json({
      company: { code, name, description, industry, invoices: invoices.rows },
    });
  } catch (e) {
    return next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { code, name, description, industries } = req.body;
    if (!code || !name)
      throw new ExpressError("Code or Name cannot be null", 400);
    const slugifiedCode = slugify(code, {
      replacement: "-",
      lower: true,
      locale: "en",
    });
    const results = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
      [slugifiedCode, name, description]
    );

    if (industries) {
      industries.map(async (ind) => {
        await db.query(
          `INSERT INTO industries_companies (comp_code, indu_code) VALUES ($1, $2)`,
          [slugifiedCode, ind]
        );
      });
      const results = await db.query(
        `
      SELECT c.code, c.name, c.description, i.industry FROM companies AS c
      LEFT JOIN industries_companies AS ic ON ic.comp_code = c.code
      LEFT JOIN industries AS i ON ic.indu_code = i.code
      WHERE c.code = $1`,
        [slugifiedCode]
      );

      let { code, name, description, industry } = results.rows[0];

      if (industry.length > 1) {
        industry = results.rows.map((entry) => entry.industry);
      }

      return res
        .status(201)
        .json({ company: { code, name, description, industry } });
    } else {
      return res
        .status(201)
        .json({ company: { ...results.rows[0] }, industry: null });
    }
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

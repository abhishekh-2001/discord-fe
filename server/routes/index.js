var express = require("express");
var router = express.Router();
var { Check } = require("../models/Check");
const { reclaimprotocol } = require("@reclaimprotocol/reclaim-sdk");
const bodyParser = require("body-parser");
const reclaim = new reclaimprotocol.Reclaim();

router.get("/", (request, response) => {
  response.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get("/getId", async (request, response) => {
  const check = new Check();
  check.data = {};
  await check.save();
  response.status(200).json({
    checkId: check.checkId,
  });
});

router.post("/update/:checkId", async (req, res) => {
  const check = await Check.findOne({ checkId: req.params.checkId });
  if (!check)
    return res.status(401).json({ message: "Invalid URL, please check." });
  
  const request = reclaim.requestProofs({
    title: "Reclaim Protocol",
    baseCallbackUrl: process.env.BASE_URL + "/proof/update",
    callbackId: check.checkId,
    requestedProofs: [
      new reclaim.CustomProvider({
        provider: "google-login",
        payload: {},
      }),
    ],
  });
  const reclaimUrl = await request.getReclaimUrl();
  if (!reclaimUrl)
    return res.status(500).json({ message: "Internal Server Error" });
  res.status(201).json({ url: reclaimUrl });
});

router.post("/proof/update", bodyParser.text("*/*"), async (req, res) => {
  const check = await Check.findOne({ checkId: req.query.id });
  if (!check) return res.status(401).send("<h1>Unable to update Proof</h1>");
  check.data = {
    ...check.data,
    proofs: JSON.parse(Object.keys(req.body)[0]).proofs,
  };
  check.data = {
    ...check.data,
    proofParams: check.data.proofs.map((proof) => JSON.parse(proof.parameters)),
  };
  await check.save();
  if (isProofsCorrect) {
    check.data = {
      ...check.data,
      proofParams: check.data.proofs.map((proof) => proof.parameters),
    };
  }
  res.status(201).send("<h1>Proof was generated</h1>");
});

router.get("/fetch/:checkId", async (req, res) => {
  const check = await Check.findOne({ checkId: req.params.checkId });
  if (!check)
    return res.status(401).json({ message: "Invalid URL, please check." });
  res.status(200).json({
    data: check.data,
  });
});

module.exports = router;

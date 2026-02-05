const express = require('express')
const router = express.Router()

const {createCropBatch , acceptOrRejectOffer , initiateLogistics } = require('../controller/farmerController')

router.post('/crop-batch', createCropBatch)
router.post('/crop-batch/accept-or-reject', acceptOrRejectOffer)
router.post('/crop-batch/initiate-logistics', initiateLogistics)

module.exports = router
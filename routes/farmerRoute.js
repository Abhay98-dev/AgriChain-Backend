const express = require('express')
const router = express.Router()

const { authenticate } = require('../middlewares/authMiddleware')
const {requireRole}   = require('../middlewares/roleMiddleware')
const {createCropBatch , acceptOrRejectOffer , initiateLogistics , getMyBatches } = require('../controller/farmerController')

router.post('/crop-batch',authenticate , requireRole("USER"), createCropBatch)
router.post('/crop-batch/accept-or-reject',authenticate , requireRole("USER"), acceptOrRejectOffer)
router.post('/crop-batch/initiate-logistics', authenticate , requireRole("USER"), initiateLogistics)
router.get('/crop-batch', authenticate , requireRole("USER"), getMyBatches)

module.exports = router
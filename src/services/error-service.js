const sendErrorResponse = (res, error) => {
    res.status(error.status ? error.status : 500).json({
        code: error.status ? error.status.toString() : "500",
        message: error.message,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    sendErrorResponse
};
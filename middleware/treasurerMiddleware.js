const { Member } = require('../models/Relationships');

module.exports = async (req, res, next) => {
    const club = req.club;
    const isOwner = req.user.id === club.userId;

    if (isOwner) return next();

    const member = await Member.findOne({
        where: { userId: req.user.id, clubId: club.id }
    });

    if (!member || !member.isTreasurer) {
        return res.status(403).json({ error: 'Requires treasurer or owner access' });
    }

    next();
};

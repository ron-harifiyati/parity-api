const { Club, Member } = require('../models/Relationships');

module.exports = async (req, res, next) => {
    const clubId = req.headers['clubid'];
    if (!clubId) {
        return res.status(400).json({ message: 'Club id required in headers' })
    };

    try {
        const club = await Club.findByPk(clubId);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' })
        };
        
        // Check if user is a withdrawn member of this club
        if (req.user && req.user.id) {
            const member = await Member.findOne({
                where: {
                    userId: req.user.id,
                    clubId: clubId
                }
            });
            
            if (member && member.withdrawnAt) {
                return res.status(403).json({ message: 'Access denied: member has withdrawn from this club' })
            }
        }
        
        req.club = club
        next()
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message })
    }
};
import Notification from '../models/Notification.js';

// @desc    Get current user's notifications (direct + broadcasts)
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({
      $or: [{ recipient: userId }, { isBroadcast: true }]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = notifications.map((n) => {
      const isReadForUser = n.isBroadcast
        ? Array.isArray(n.readBy) && n.readBy.some((id) => id.toString() === userId.toString())
        : Boolean(n.isRead);

      return {
        _id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        orderId: n.orderId,
        orderNumber: n.orderNumber,
        isBroadcast: n.isBroadcast,
        isRead: isReadForUser,
        createdAt: n.createdAt
      };
    });

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return res.json({
      success: true,
      count: formatted.length,
      unreadCount,
      data: formatted
    });
  } catch (error) {
    console.error('[Notification Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.'
    });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.isBroadcast) {
      if (!notification.readBy.some((id) => id.toString() === userId.toString())) {
        notification.readBy.push(userId);
        await notification.save();
      }
    } else {
      if (notification.recipient && notification.recipient.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this notification'
        });
      }
      notification.isRead = true;
      await notification.save();
    }

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('[Mark Read Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Promise.all([
      Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true }),
      Notification.updateMany(
        { isBroadcast: true, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
      )
    ]);

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('[Mark All Read Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

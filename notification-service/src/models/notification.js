'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    taskId: { type: String, required: true },
    type: { type: String, default: 'task.created' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Notification', NotificationSchema);

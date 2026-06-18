const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
    },

    
    warRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WARRoom',
      default: null,
    },

    
    submittedFlag: {
      type: String,
      required: true,
      select: false,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },

    
    pointsAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },

    
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt = timestamp dell'invio
  }
);



SubmissionSchema.index({ user: 1, challenge: 1 });


SubmissionSchema.index({ challenge: 1, isCorrect: 1 });

module.exports = mongoose.model('Submission', SubmissionSchema);

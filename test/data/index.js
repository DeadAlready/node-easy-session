'use strict';

const roles = {
  user: {
    can: [
      'account',
      'post:add',
      {name: 'post:save', when: async (params) => params.ownerId === params.userId}
    ]
  },
  manager: {
    can: ['post:delete'],
    inherits: ['user']
  },
  admin: {
    can: ['user:delete'],
    inherits: ['manager']
  }
};

module.exports.all = {
  roles,
};

module.exports.roles = roles;
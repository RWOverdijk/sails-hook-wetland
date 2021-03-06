const Wetland    = require('wetland').Wetland;
const actionUtil = require('sails/lib/hooks/blueprints/actionUtil');
const Model      = require('./Model');
const path       = require('path');
const blueprints = {
  find    : require('./blueprints/find'),
  create  : require('./blueprints/create'),
  findone : require('./blueprints/findOne'),
  update  : require('./blueprints/update'),
  destroy : require('./blueprints/destroy'),
  populate: require('./blueprints/populate'),
  add     : require('./blueprints/add'),
  remove  : require('./blueprints/remove')
};

actionUtil.populateQuery = (query, associations, sails) => {
  let defaultLimit = (sails && sails.config.blueprints.defaultLimit) || 30;
  let populates    = associations.map(association => {
    if (query) {
      query.populate(association.alias, {
        limit: association.limit || defaultLimit
      });
    }

    return association.alias;
  });

  if (query) {
    return query;
  }

  return populates;
};

module.exports = sails => {
  return {
    defaults: () => {
      return {
        wetland: {
          entityPath: path.resolve(process.cwd(), 'api', 'entity')
        }
      };
    },

    configure: () => {
      sails.config.globals.wetland = sails.config.globals.wetland || false;
    },

    initialize: callback => {
      sails.on('hook:orm:loaded', () => {
        this.wetland = new Wetland(sails.config.wetland);

        // Make model stubs
        let entities = this.wetland.getEntityManager().getEntities();

        Object.getOwnPropertyNames(entities).forEach(name => {
          let model = new Model(name, entities[name]);

          sails.models[model.identity] = model;
        });

        // Override default blueprints
        Object.getOwnPropertyNames(blueprints).forEach(function(action) {
          sails.hooks.blueprints.middleware[action] = blueprints[action];
        });

        sails.wetland = this.wetland;

        sails.emit('hook:orm:reloaded');

        return callback();
      });
    },

    routes: {
      before: {
        '*': (req, res, next) => {
          let manager;
          let getManager = () => {
            if (!manager) {
              manager = this.wetland.getManager();
            }

            return manager;
          };

          // Convenience functions on req to work with database.
          req.getManager = getManager;

          req.getRepository = (Entity) => {
            return getManager().getRepository(Entity);
          };

          // Make wetland accessible
          req.wetland = this.wetland;

          // You may now proceed, peasant.
          return next();
        }
      }
    }
  }
};

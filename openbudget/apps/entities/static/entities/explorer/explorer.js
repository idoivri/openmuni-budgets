define([
    'uijet_dir/uijet',
    'resources',
    'api',
    'modules/data/backbone',
    'modules/router/backbone',
    'modules/dom/jquery',
    'modules/pubsub/eventbox',
    'modules/promises/q',
    'modules/engine/mustache',
    'modules/xhr/jquery',
    'modules/animation/uijet-transit',
    'modules/search/uijet-search',
    'project_modules/uijet-i18n'
], function (uijet, resources, api, Backbone, Router, $, Ebox, Q, Mustache) {

    var explorer;

    // make sure all jQuery requests (foreign and domestic) have a CSRF token 
    $(document).ajaxSend(function (event, xhr, settings) {
        if ( ! settings.headers )
            settings.headers = {};

        if ( ! ('X-CSRFToken' in settings.headers) )
            settings.headers['X-CSRFToken'] = api.getCSRFToken();
    });
    $(window).on('resize', function () {
        uijet.publish('app.resize');
    });

    // get version endpoint
    api.getVersion();

    /*
     * Register resources
     */
    uijet
    .Resource('Breadcrumbs',
        uijet.Collection({
            model   : resources.Item
        }),
        window.ITEM.ancestors || []
    )
    .Resource('ItemsListState',
        uijet.Model(), {
            search  : null,
            sheet   : window.SHEET.id,
            period  : +window.SHEET.period,
            scope   : +window.ITEM.node || null
        }
    )
    .Resource('LatestSheet', resources.Items)
    .Resource('PreviousSheets', resources.Sheets);

    if ( window.ITEM.id ) {
        // add initial item to LatestSheet
        uijet.Resource('LatestSheet').add(window.ITEM);
    }

    explorer = {
        router      : Router({
            routes  : {
                'entities/:entity/' : function (entity) {
                    this.navigate(uijet.Resource('ItemsListState').get('period') + '/', { 
                        replace : true,
                        silent  : true
                    });
                },
                'entities/:entity/:period/' : function (entity, period) {
                    uijet.Resource('ItemsListState').set({
                        period  : +period,
                        scope   : null,
                        routed  : true
                    });
                },
                'entities/:entity/:period/:uuid/' : function (entity, period, uuid) {
                    var item = uijet.Resource('LatestSheet').findWhere({ uuid : uuid }),
                        scope;

                    if ( ! item ) {
                        scope = -1;
                    }
                    else {
                        scope = +item.get('node');
                    }

                    uijet.Resource('ItemsListState').set({
                        sheet   : explorer.getSheetId(period),
                        period  : +period,
                        scope   : scope,
                        uuid    : uuid,
                        routed  : true
                    });
                }
            }
        }),
        start       : function (options) {
            /*
             * Get an OAuth2 token
             */
//            api.auth({
//                data    : options.auth,
//                success : function (auth_response) {
                    // set the API's routes
//                    api.getRoutes({
//                        success : function (response) {
//                            api._setRoutes(response);
//                            uijet.publish('api_routes_set');
//                        }
//                    });
//                    explorer.setToken(auth_response.access_token);
//                }
//            });
            var routes_deferred = uijet.Promise();
            explorer.routes_set_promise = routes_deferred.promise();

            // set the API's routes
            api.getRoutes({
                success : function (response) {
                    api._setRoutes(response);
                    routes_deferred.resolve();
                }
            });

            /*
             * Register handlers to events in UI
             */
            uijet.subscribe('startup', function () {
                explorer.routes_set_promise.then(function () {
                    Backbone.history.start({
                        pushState   : true,
                        root        : '/entities/' + window.ENTITY.slug + '/'
                    });
                });
            })

            /*
             * Starting uijet
             */
            .init({
                element             : '#explorer',
                templates_path      : '/static/entities/explorer/templates/',
                templates_extension : 'ms'
            });
        },
        getSheetId  : function (period) {
            return +window.ENTITY.sheets.filter(function (sheet) {
                return sheet.period == period;
            })[0].id;
        }
    };

    return explorer;
});

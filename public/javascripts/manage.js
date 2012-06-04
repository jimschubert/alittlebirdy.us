$(function() {
    $.get('/getFriends', function(rsp) {
        console.log(rsp);
        $('#bucket').html('');
        $('#list-member').tmpl( JSON.parse(rsp.data) ).appendTo('#bucket');
        $('.list-member').draggable({
            revert: 'invalid',
            helper: 'clone'
        });
        $('#list-members').droppable({
            accept: '.list-member',
            activeClass: 'current-list-ready',
            hoverClass: 'current-list-drop',
            drop: function(event, ui) {
                var list = $('li.list.selected'),
                    opts = getListMemberOpts(list, ui);

                console.log(opts);
            }       
        });
    });

    var getListMemberOpts = function (list, ui) {
        var opts = { };
        opts.list_id = $(list).find('.id').val();
        opts.screen_name = $(ui.draggable).find('.twipsy-inner').text();
        opts.slug = $(list).find('.slug').val();           
        return opts;
    }
});

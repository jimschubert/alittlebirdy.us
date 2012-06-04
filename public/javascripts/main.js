$(function() {
 
    var getListMemberOpts = function (list, ui) {
        var opts = { };
        opts.list_id = $(list).find('.id').val();
        opts.screen_name = $(ui.draggable).find('.twipsy-inner').text();
        opts.slug = $(list).find('.slug').val();           
        return opts;
    }

    $('.alert-message a.close').click(function() {
        $(this).parents('.alert-message:first').slideUp('fast');
    });

    $('a.current-user').hover( $('.current-status').show, $('.current-status').hide );

    $('a.dropdown-toggle').click(function() {
        $('ul.dropdown-menu').toggle();
        $('ul.dropdown-menu').mouseleave(function(){
            $('ul.dropdown-menu').hide();
        });
    });

    $('#remove').droppable({
        accept: '.list-member', activeClass: 'remove-ready', hoverClass: 'remove-drop',
        drop: function(event, ui) {
            var list = $('li.list.selected'),
                opts = getListMemberOpts(list, ui);
           
            if(opts.list_id && opts.screen_name) {
                $.post('/removeUser', opts, function(data) {
                    if(data && !data.success) { console.log(data); } 
                    else {
                        $(ui.draggable).hide("explode", 500).remove();
                    }
                });
            }
        }
    });

    $('#user-lists ul li').droppable({
        accept: '.list-member', activeClass: 'add-to-list-ready', hoverClass: 'add-to-list-drop',
        drop: function(event, ui) {
            // do stuff.
            var list = $(this),
                opts = getListMemberOpts(list, ui);

            if(opts.list_id && opts.screen_name) {
                $.post('/addUser', opts, function(data) {
                    // show a notification.
                });
            }
        }
    }); /* #user-lists ul li .droppable() */

    $('li.list').click(function() {
        $('li.list').removeClass('selected');
        $(this).addClass('selected');

        var listId = $(this).find('input[type="hidden"].id').val();
        var slug = $(this).find('input[type="hidden"].slug').val();

        $.post('/membersForList', { list_id: listId }, function(data) {
            $('#list-members').html('');
            $('#list-member').tmpl(data.users).appendTo('#list-members');
            $('.list-member').draggable({ 
                revert: 'invalid',
                helper: 'clone'
            });
        });
    }); /* li.list .click() */

    // Had to remove the /getFollowers method because we're only allowed 150 req/hour
});

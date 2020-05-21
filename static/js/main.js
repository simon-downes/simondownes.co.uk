// The following code is based off a toggle menu by @Bradcomp
// source: https://gist.github.com/Bradcomp/a9ef2ef322a8e8017443b626208999c1
(function() {
    var burger = document.querySelector('.burger');
    var menu = document.querySelector('#'+burger.dataset.target);
    burger.addEventListener('click', function() {
        burger.classList.toggle('is-active');
        menu.classList.toggle('is-active');
    });
})();

$('#contact-form').on('submit', function( e ) {

    // reset form state
    $('#contact-form input').removeClass('is-danger');
    $('#contact-form textarea').removeClass('is-danger');
    $('#contact-form .help').hide();
    $('#contact-form .message').hide();

    // disable submit button and show wait status indicators
    $('#contact-form button[type=submit]').prop('disabled', true).addClass('is-loading');
    $('body').css('cursor', 'wait');

    fetch(
        $(e.target).attr('action'),
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: $('#contact-name').val(),
                email: $('#contact-email').val(),
                message: $('#contact-message').val(),
                captcha: $('#g-recaptcha-response').val(),
            }),
        }
    )
    .then(response => {

        // if we get a successful response we'll just assume the message was sent
        if( response.ok ) {
            $('#contact-form .buttons').hide();
            $('#contact-form .message.is-success').show();
        }
        // validation error
        else if( response.status == 400 ) {

            // wait for the response body and then show the error messages
            response.json().then(data => {
                console.log(data);
                Object.entries(data.errors).forEach(([field, message]) => {
                    if( field == 'captcha' ) {
                        $('#captcha-error').text(message).show();
                        return;
                    }
                    $('#contact-' + field).addClass('is-danger');
                    $('#contact-' + field).parent().siblings('.help').text(message).show();
                });
            });

        }
        // server error
        else if( response.status == 500 ) {
            throw 'Server Error';
        }
        else {
            throw 'Unexpected Error';
        }

    })
    .catch(error => {

        console.error('Error:', error);

        // attempt to calculate a first name
        var name = $('#contact-name').val();
        var firstName = name;
        if( name.indexOf(' ') >= 0 ) {
            firstName = name.split(' ').slice(0, -1).join(' ');
        }

        // display nice error message
        $('#contact-form .message.is-danger .message-body').text("Sorry " + firstName + ", it seems that an error occurred. Please try again later...");
        $('#contact-form .message.is-danger').show();

    })
    .finally(() => {
        // clear wait status indicators
        $('#contact-form button').prop('disabled', false).removeClass('is-loading').trigger('blur');
        $('body').css({'cursor': 'auto'})
    })

    // don't execute the normal form submission handler
    e.preventDefault();
    e.stopPropagation();
    return false;

});

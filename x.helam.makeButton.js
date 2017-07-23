const profiler = require('screeps-profiler');

let makeButton = {
/**
     * Returns html for a button that will execute the given command when pressed in the console.
     * @param id (from global.getId, value to be used for the id property of the html tags)
     * @param text (text value of button)
     * @param command {String} (command to be executed when button is pressed)
     * @param opts {Object} (see settings object in function for options)
     * @returns {string}
     * Authors: Helam, Vaejor
     */
    makeButton:  function(id, text, command, opts = {}) {
        var settings = {
            browserFunction: false, // determines whether the function will be run in the browser or not
            type: undefined, // special option for storageContents function. resource type.
            color: `#555`, // color of button
            textColor: `white`, // color of text
            confirmText: undefined, // if a string is given, clicking the button will show a confirmation button along with this confirm text
            attributes: {} // other attributes you want the input tag to have. Its an object where the keys are the attribute names and the values are the values
        };
        Object.assign(settings, opts);

        settings.attributes[ 'style' ] = ( settings.attributes[ 'style' ] || '' ) + `;background-color:${settings.color};color:${settings.textColor};`;

        let attributesString = Object.keys(settings.attributes).reduce((str,key) => {
            return `${str} ${key}="${settings.attributes[key]}"`;
        },'');

        var outstr = ``;
        var handler = ``;
        if (settings.browserFunction) {
            outstr += `<script>var bf${id}${settings.type} = ${command}</script>`;
            handler = `bf${id}${settings.type}()`
        } else {
            command = command.replace(/(?!\\)`/gi, `\\\``);
            outstr += `<script>var command${id}${settings.type} = \`${command}\`</script>`;
            handler = `customCommand${id}${settings.type}(command${id}${settings.type})`;
        }
        if (settings.confirmText) {
            let confirmButton = `<input type="button" value="${text}" onclick="${handler.replace(/`/gi, `\\\``)}" ${attributesString}/>`;
            let confirmCommand = `console.log(\\\`${settings.confirmText}  ${confirmButton.replace(/`/gi, `\\\\\``)}\\\`);`;
            outstr += `<script>var confirm${id}${settings.type} = \`${confirmCommand}\`;</script>`;
            outstr += `<script>var handlerConfirm${id}${settings.type} = function() { $( 'body' ).injector().get( 'Api' ).post( "user/console", { expression: confirm${id}${settings.type} } ); };</script>`;
            handler = `handlerConfirm${id}${settings.type}()`;
        }

        outstr += `<script>var customCommand${id}${settings.type} = function(command) { $('body').injector().get('Api').post("user/console", { expression: command } ) }</script>`;
        outstr += `<input type="button" value="${text}" onclick="${handler}" ${attributesString}/> `;

        return outstr;
    }
};

profiler.registerObject(makeButton,'makeButton');
module.exports = makeButton;
var DISCORD = (function(){
  var REGEX = {
    formatBold: /\*\*([\s\S]+?)\*\*(?!\*)/g,
    formatItalic: /(.)?\*([\s\S]+?)\*(?!\*)/g,
    formatUnderline: /__([\s\S]+?)__(?!_)/g,
    formatStrike: /~~([\s\S]+?)~~(?!~)/g,
    formatCodeInline: /(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/g,
    formatCodeBlock: /```(?:([A-z0-9\-]+?)\n+)?\n*([^]+?)\n*```/g,
    formatUrl: /(\b(?:https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
    formatUrlNoEmbed: /<(\b(?:https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])>/ig,
    specialEscapedBacktick: /\\`/g,
    specialEscapedSingle: /\\([*\\])/g,
    specialEscapedDouble: /\\__|_\\_|\\_\\_|\\~~|~\\~|\\~\\~/g,
    specialUnescaped: /([*_~\\])/g,
    mentionRole: /&lt;@&(\d+?)&gt;/g,
    mentionUser: /&lt;@!?(\d+?)&gt;/g,
    mentionChannel: /&lt;#(\d+?)&gt;/g
  };
  
  var templateChannelServer;
  var templateChannelPrivate;
  var templateMessage;
  var templateEmbedImage;
  var templateEmbedDownload;
  
  return {
    setup: function(){
      templateChannelServer = new TEMPLATE([
        "<div data-channel='{id}'>",
        "<div class='info'><strong class='name'>#{name}</strong><span class='msgcount'>{msgcount}</span></div>",
        "<span class='server'>{server.name} ({server.type})</span>",
        "</div>"
      ].join(""));
      
      templateChannelPrivate = new TEMPLATE([
        "<div data-channel='{id}'>",
        "<div class='info'><strong class='name'>{name}</strong><span class='msgcount'>{msgcount}</span></div>",
        "<span class='server'>({server.type})</span>",
        "</div>"
      ].join(""));
      
      templateMessage = new TEMPLATE([
        "<div>",
        "<h2><strong class='username'>{user.name}</strong><span class='info time'>{timestamp}</span>{edited}</h2>",
        "<div class='message'>{contents}{embeds}{attachments}</div>",
        "</div>"
      ].join(""));
      
      templateEmbedImage = new TEMPLATE([
        "<a href='{url}' class='embed thumbnail'><img src='{url}' alt='(image attachment not found)'></a><br>"
      ].join(""));
      
      templateEmbedDownload = new TEMPLATE([
        "<a href='{url}' class='embed download'>Download {filename}</a>"
      ].join(""));
    },
    
    getChannelHTML: function(channel){
      return (channel.server.type === "SERVER" ? templateChannelServer : templateChannelPrivate).apply(channel, (property, value) => {
        if (property === "server.type"){
          switch(value){
            case "SERVER": return "server";
            case "GROUP": return "group";
            case "DM": return "user";
          }
        }
      });
    },
    
    getMessageHTML: function(message){
      return templateMessage.apply(message, (property, value) => {
        if (property === "timestamp"){
          var date = new Date(value);
          return date.toLocaleDateString()+", "+date.toLocaleTimeString();
        }
        else if (property === "contents"){
          if (value.length === 0){
            return "";
          }
          
          var processed = DOM.escapeHTML(value.replace(REGEX.formatUrlNoEmbed, "$1"));
          
          if (STATE.settings.enableFormatting){
            var escapeHtmlMatch = (full, match) => "&#"+match.charCodeAt(0)+";";
            
            processed = processed
              .replace(REGEX.specialEscapedBacktick, "&#96;")
              .replace(REGEX.formatCodeBlock, (full, ignore, match) => "<code class='block'>"+match.replace(REGEX.specialUnescaped, escapeHtmlMatch)+"</code>")
              .replace(REGEX.formatCodeInline, (full, ignore, match) => "<code class='inline'>"+match.replace(REGEX.specialUnescaped, escapeHtmlMatch)+"</code>")
              .replace(REGEX.specialEscapedSingle, escapeHtmlMatch)
              .replace(REGEX.specialEscapedDouble, full => full.replace(/\\/g, "").replace(/(.)/g, escapeHtmlMatch))
              .replace(REGEX.formatBold, "<b>$1</b>")
              .replace(REGEX.formatItalic, (full, pre, match) => pre === '\\' ? full : pre+"<i>"+match+"</i>")
              .replace(REGEX.formatUnderline, "<u>$1</u>")
              .replace(REGEX.formatStrike, "<s>$1</s>");
          }
          
          processed = processed
            .replace(REGEX.formatUrl, "<a href='$1' target='_blank' rel='noreferrer'>$1</a>")
            .replace(REGEX.mentionChannel, (full, match) => "<span class='link mention-chat'>#"+STATE.getChannelName(match)+"</span>")
            .replace(REGEX.mentionUser, (full, match) => "<span class='link mention-user'>@"+STATE.getUserName(match)+"</span>");
          
          return "<p>"+processed+"</p>";
        }
        else if (property === "embeds"){
          if (!value){
            return "";
          }
          
          return value.map(embed => {
            return embed.type === "image" && STATE.settings.enableImagePreviews ? templateEmbedImage.apply(embed) : "";
          }).join("");
        }
        else if (property === "attachments"){
          if (!value){
            return "";
          }
          
          return value.map(attachment => {
            var ext = attachment.url.slice(-4).toLowerCase();

            if ((ext === ".png" || ext === ".gif" || ext === ".jpg" || ext === ".jpeg") && STATE.settings.enableImagePreviews){
              return templateEmbedImage.apply(attachment);
            }
            else{
              var sliced = attachment.url.split("/");

              return templateEmbedDownload.apply({
                "url": attachment.url,
                "filename": sliced[sliced.length-1]
              });
            }
          }).join("");
        }
        else if (property === "edited"){
          return value ? "<span class='info edited'>(edited)</span>" : "";
        }
      });
    }
  };
})();

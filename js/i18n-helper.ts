const FLAG_VERIFIED = 'human-verified';

interface SideSettings {
    advanced_filter?: boolean;
}
let settings: SideSettings = {} as any;
const save_settings = () => {
    localStorage.setItem('teaspeak-i18n-settings', JSON.stringify(settings));
};
{
    const settings_string = localStorage.getItem('teaspeak-i18n-settings');
    if(settings_string) {
        try {
            settings = JSON.parse(settings_string);
        } catch(error) {
            console.warn("Failed to parse side settings: %o", error);
        }
    }
}

interface TranslationEntry {
    flags?: string[];
    key: {
        message: string;
    };
    translated?: string;
}

interface TranslationFile {
    info: {
        contributors: any;
    };

    translations: TranslationEntry[];
}

const container_file_load = $(".container-file-load");
const container_file_loaded = $(".container-file-loaded");
const ot_text_filter = $(".input-ot-filter");
const ot_flags_filter = $(".input-ot-filter-flags");
const ot_flags_filter_negate = $(".input-ot-filter-flags-negate");
const container_translations = $(".container-translations");
const contianer_list_flags = $(".container-list-flags");

let current_file_name = "";
let current_data: TranslationFile = undefined;
let current_translation: TranslationEntry | undefined;

const button_approve = $(".button-tr-approve");
const ta_original_text = $(".ta-tr-original");
const ta_translated_text = $(".ta-tr-translated");
const checkbox_filter_approved = $(".input-ot-filter-flags-approved");

const strip = (text: string) => {
    while(text.startsWith(" "))
        text = text.substr(1);
    while(text.endsWith(" "))
        text = text.substr(0, text.length - 2);
    return text;
};

const apply_filter = () => {
    let count = 0, total = 0;
    const filter_text = (ot_text_filter.val() as string).toLowerCase();
    let filter_flags = (ot_flags_filter.val() as string).toLowerCase().split(",").map(e => strip(e));
    let filter_flags_negate = (ot_flags_filter_negate.val() as string).toLowerCase().split(",").map(e => strip(e));
    if((checkbox_filter_approved[0] as HTMLInputElement).checked)
        filter_flags.push(FLAG_VERIFIED);
    else if(!(checkbox_filter_approved[0] as HTMLInputElement).indeterminate)
        filter_flags_negate.push(FLAG_VERIFIED);

    filter_flags = filter_flags.filter(e => !!e);
    filter_flags_negate = filter_flags_negate.filter(e => !!e);

    container_translations.children().each((_, e) => {
        const entry = $(e);
        const translation = current_data.translations[parseInt(entry.attr('tr-index'))];

        let approved = translation.flags.findIndex(e => e === FLAG_VERIFIED) !== -1;
        let visiable = true;
        if(filter_text && visiable)
            visiable = translation.key.message.toLowerCase().indexOf(filter_text) != -1 || (translation.translated || "").toLowerCase().indexOf(filter_text) != -1;
        if(filter_flags_negate.length > 0 && visiable) {
            visiable = filter_flags_negate.findIndex(e => (translation.flags || []).indexOf(e) != -1) == -1;
        }
        if(filter_flags.length > 0 && visiable) {
            visiable = filter_flags.findIndex(e => (translation.flags || []).indexOf(e) == -1) == -1;
        }
        entry.attr("x-approved", approved ? "" : null);
        entry.toggle(visiable);
        if(visiable)
            count++;
        total++;
    });

    $(".ct-shown-entries").text(count.toString());
    $(".ct-all-entries").text(total.toString());
};
ot_text_filter.on('change keyup', () => apply_filter());
ot_flags_filter.on('change', () => apply_filter());
ot_flags_filter_negate.on('change', () => apply_filter());

const _add_flag = (flag) => {
    const li = $(document.createElement("li")).addClass("list-group-item").append(
        $(document.createElement("div")).addClass("input-group").append(
            $(document.createElement("input")).attr("type", "text").addClass("form-control").val(flag),
            $(document.createElement("div")).addClass("input-group-append").append(
                $(document.createElement("button")).attr("type", "button").addClass("btn btn-outline-danger").html('&times;').on('click', event => {
                    li.detach();
                    const index = current_translation.flags.indexOf(flag);
                    if(index >= 0)
                        current_translation.flags.splice(index, 1);
                    if(flag === FLAG_VERIFIED) {
                        set_current_translation(current_translation); /* update buttons etc */
                        apply_filter();
                    }
                })
            )
        )
    );
    li.appendTo(contianer_list_flags);
    if(flag === FLAG_VERIFIED)
        apply_filter();
};

$(".input-t-flag-new").on('change keyup', event => {
    $(".button-t-flag-new").prop('disabled', !(event.target as HTMLInputElement).value);
});

$(".button-t-flag-new").on('click', event => {
    const flag = $(".input-t-flag-new").val() as string;
    console.log(flag);
    if(!flag)
        return;
    _add_flag(flag);
    current_translation.flags = current_translation.flags || [];
    current_translation.flags.push(flag);
});

const set_current_translation = (trans: TranslationEntry | undefined) => {
    current_translation = trans;

    ta_original_text.val(trans ? trans.key.message : "");
    ta_translated_text.val(trans ? trans.translated : "");

    contianer_list_flags.children().detach();
    for(const flag of trans ? trans.flags : [])
        _add_flag(flag);
    button_approve.toggle(trans && (trans.flags || []).findIndex(e => e === FLAG_VERIFIED) == -1);
};

ta_translated_text.on('change keyup', event => {
    current_translation.translated = ta_translated_text.val() as any;
});

button_approve.on('click', event => {
    current_translation.flags.push(FLAG_VERIFIED);
    _add_flag(FLAG_VERIFIED);
    button_approve.toggle(false);
});

const load_from_data = (data: TranslationFile) => {
    current_data = data;
    console.dir(current_data);
    container_translations.children().detach();

    let index = 0;
    for(const translation of data.translations) {
        const entry = $(document.createElement("li"));
        entry.addClass("list-group-item").css('cursor', 'pointer').attr("tr-index", index++).text(translation.key.message).on('click', event => {
            container_translations.find('.active').removeClass("active");
            set_current_translation(translation);
            $(event.target).addClass("active");
        }).appendTo(container_translations);
    }
    apply_filter();
};

$(".button-load-file").on('click', event => {
     $("#input-file-select").trigger('click');
});

const show_error = message => {
    alert(message);
};

$("#input-file-select").on('change', event => {
    const input = event.target as HTMLInputElement;
    if(input.files.length == 0)
        return;


    const reader = new FileReader();
    reader.onload = e => {

        let data;
        try {
            data = JSON.parse(reader.result as string);
        }
        catch (error) {
            console.error("Failed to parse json data: %o", error);
            show_error("Failed to parse file. Please lookup the console for more details.");
            return;
        }

        if(typeof(data["info"]) !== "object" || !Array.isArray(data["translations"])) {
            show_error("Target file seems not to be a translation file");
            return;
        }

        load_from_data(data);

        container_file_loaded.find(".label-current-file").text(input.files[0].name);
        container_file_loaded.show();
        container_file_load.hide();
    };
    reader.onerror = error => {
        console.log(error);
        show_error("Failed to load file. Please lookup the console for more details.");
    };
    reader.readAsText(input.files[0]);
    current_file_name = input.files[0].name;
});

$("nav button").on('click', e => e.preventDefault());
set_current_translation(undefined);



function download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
$(".button-save-file").on('click', event => {
   download(current_file_name, JSON.stringify(current_data, undefined, "    "));
});

{
    $(".container-ot-filter-flags-approved").on('click', event => {
        if(checkbox_filter_approved.prop('indeterminate')) {
            checkbox_filter_approved.prop('indeterminate', false);
            checkbox_filter_approved.prop('checked', true);
        } else if(checkbox_filter_approved.prop('checked')) {
            checkbox_filter_approved.prop('checked', false);
        } else
            checkbox_filter_approved.prop('indeterminate', true);
        apply_filter();
    });
    checkbox_filter_approved.prop('indeterminate', true);
}

{
    const button_advanced_filter = $(".button-ot-filter-advanced");
    const container = $(".container-advanced-filter");

    button_advanced_filter.on('click', event => {
        const visibility = container.is(':visible');
        if(visibility)
            container.hide('slow');
        else
            container.show('slow');
        button_advanced_filter.toggleClass('btn-secondary', visibility);
        button_advanced_filter.toggleClass('btn-outline-secondary', !visibility);
        settings.advanced_filter = !visibility;
        save_settings();
    });

    //save_settings
    container.toggle(!settings.advanced_filter);
    button_advanced_filter.trigger('click');
}
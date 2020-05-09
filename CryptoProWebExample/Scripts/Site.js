(function (m, $, undefined) {

	var isCryptoProPluginLoaded = false;
	var isCryptoProPluginEnabled = false;

	NETTRASH.Initialize = function () {
		console.log("NETTRASH.Initialized");
		try {
			var oAbout = cadesplugin.CreateObject("CAdESCOM.About");
			isCryptoProPluginLoaded = true;
			isCryptoProPluginEnabled = true;
			var oPluginVersion = oAbout.PluginVersion;
			if (typeof (oPluginVersion) == "undefined")
				oPluginVersion = oAbout.Version;
			var oVersion = oAbout.CSPVersion("", 80);
			var sCSPName = oAbout.CSPName(80);
			console.log("Plugin Ver:" + oPluginVersion.MajorVersion + "." + oPluginVersion.MinorVersion + "." + oPluginVersion.BuildVersion);
			console.log("CSP Ver:" + oVersion.MajorVersion + "." + oVersion.MinorVersion + "." + oVersion.BuildVersion);
			console.log("CSP Name: " + sCSPName)
		}
		catch (oError) {
			var mimetype = navigator.mimeTypes["application/x-cades"];
			if (mimetype) {
				isCryptoProPluginLoaded = true;
				var plugin = mimetype.enabledPlugin;
				if (plugin) {
					isCryptoProPluginEnabled = true;
				}
			}
		}
	};

	NETTRASH.FillCertificates = function (eSelect) {
		if (isCryptoProPluginEnabled) {
			try {
				var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
				oStore.Open();
			}
			catch (ex) {
				console.log("Certificates Store My is not accessible");
				return;
			}

			var nCertCount = oStore.Certificates.Count;
			for (var i = 1; i <= nCertCount; i++) {
				var oCertificate;
				try {
					oCertificate = oStore.Certificates.Item(i);
				}
				catch (ex) {
					alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
					return;
				}
				var oItem = new Option(oCertificate.SubjectName, oCertificate.Thumbprint);
				oItem.text = oCertificate.SubjectName;
				$(eSelect).append(oItem);
			}
			oStore.Close();
		}
	}

	NETTRASH.FindCertificateByThumbprint = function (oStore, sThumbprint) {
		var nCertCount = oStore.Certificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = oStore.Certificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			if (oCertificate.Thumbprint === sThumbprint) break;
		}
		return oCertificate;
	}

	NETTRASH.DoEncrypt = function (sTextToEncrypt, sThumbprint) {

		var result = {
			success: false,
			sessionKeyDiversData: "",
			sessionKeyIV: "",
			dataEncrypted: "",
			encryptedSessionKey: "",
			errorMessage: ""
		};

		try {
			var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
			oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			result.errorMessage = "Certificates store My is not accessible";
			return result;
		}

		var oCertificate = NETTRASH.FindCertificateByThumbprint(oStore, sThumbprint);

		var sDataToEncrypt = Base64.encode(sTextToEncrypt);

		if (sDataToEncrypt === "") {
			console.log("Empty data to encrypt");
			oStore.Close();
			result.errorMessage = "Empty data to encrypt";
			return result;
		}

		try {
			try {
				var oSymAlgo = cadesplugin.CreateObject("cadescom.symmetricalgorithm");
			} catch (oError) {
				console.log("Failed to create cadescom.symmetricalgorithm: " + oError);
				oStore.Close();
				result.errorMessage = "Failed to create cadescom.symmetricalgorithm: " + oError;
				return result;
			}

			oSymAlgo.GenerateKey();

			var oSessionKey = oSymAlgo.DiversifyKey();
			result.sessionKeyDiversData = oSessionKey.DiversData;
			result.sessionKeyIV = oSessionKey.IV;
			result.dataEncrypted = oSessionKey.Encrypt(sDataToEncrypt, 1);
			result.encryptedSessionKey = oSymAlgo.ExportKey(oCertificate);

			result.success = true;
			console.log("Data encrypted");
		}
		catch (oError) {
			console.log(oError);
			result.errorMessage = oError;
		}

		oStore.Close();

		return result;
	}

	NETTRASH.DoDecrypt = function (oEncryptedData, sThumbprint) {
		var result = {
			success: false,
			message: ""
		};

		try {
			var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
			oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			return result;
		}

		var oCertificate = NETTRASH.FindCertificateByThumbprint(oStore, sThumbprint);

		try {
			try {
				var oSymAlgo = cadesplugin.CreateObject("cadescom.symmetricalgorithm");
			} catch (ex) {
				console.log("Failed to create cadescom.symmetricalgorithm: " + ex);
				oStore.Close();
				result.message = "Failed to create cadescom.symmetricalgorithm: " + ex;
				return result;
			}
			oSymAlgo.ImportKey(oEncryptedData.encryptedSessionKey, oCertificate);
			oSymAlgo.DiversData = oEncryptedData.sessionKeyDiversData;
			var oSesssionKey = oSymAlgo.DiversifyKey();
			oSesssionKey.IV = oEncryptedData.sessionKeyIV;
			var sDecryptedData = oSesssionKey.Decrypt(oEncryptedData.dataEncrypted, 1);
			var sData = Base64.decode(sDecryptedData);

			result.message = sData;
			result.success = true;
			console.log("Data decrypted");
		}
		catch (ex) {
			result.message = ex;
			console.log(ex);
		}

		oStore.Close();

		return result;
	}

	NETTRASH.SignText = function (sValue, sThumbprint, eResult) {
		function SignCreate(sThumbprint, sDataToSign) {
			try {
				var oStore = cadesplugin.CreateObject("CAdESCOM.Store");
				oStore.Open();
			}
			catch (ex) {
				console.log("Certificates store My is not accessible");
				return;
			}

			var oCertificate = NETTRASH.FindCertificateByThumbprint(oStore, sThumbprint);
			if (!oCertificate) return;

			var oSigner = cadesplugin.CreateObject("CAdESCOM.CPSigner");
			oSigner.Certificate = oCertificate;
			oSigner.TSAAddress = "http://cryptopro.ru/tsp/";
			oSigner.Options = cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN;

			var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
			oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
			oSignedData.Content = Base64.encode(sDataToSign);

			try {
				var sSignedMessage = oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_BES);
			} catch (oError) {
				alert("Failed to create signature. Error: " + cadesplugin.getLastError(oError));
				return;
			}

			oStore.Close();

			return sSignedMessage;
		}

		function Verify(sSignedMessage) {
			var oSignedData = cadesplugin.CreateObject("CAdESCOM.CadesSignedData");
			oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
			try {
				oSignedData.VerifyCades(sSignedMessage, cadesplugin.CADESCOM_CADES_BES, true);
			} catch (err) {
				alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
				return false;
			}

			return true;
		}

		console.log("SignText(" + sValue + ")")

		if (isCryptoProPluginEnabled) {
			var sSignedMessage = SignCreate(sThumbprint, sValue);

			$(eResult).val(sSignedMessage);

			var bVerifyResult = Verify(sSignedMessage);
			$(eResult).removeClass('success');
			$(eResult).removeClass('error');
			if (bVerifyResult) {
				console.log("Signature verified");
				$(eResult).addClass('success');
			} else {
				$(eResult).addClass('error');
			}
		} else {
			alert('Please install CryptoPro Plugin');
		}
	};

	NETTRASH.EncryptText = function (sTextToEncrypt, sThumbprint, eResult) {

		$(eResult).removeClass('success');
		$(eResult).removeClass('error');

		var oEncryptedData = NETTRASH.DoEncrypt(sTextToEncrypt, sThumbprint);
		$(eResult).val(JSON.stringify(oEncryptedData));

		if (oEncryptedData.success === true) {
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}
	}

	NETTRASH.DecryptText = function (oEncryptedData, sThumbprint, eResult) {

		$(eResult).removeClass('success');
		$(eResult).removeClass('error');

		var oDecryptedData = NETTRASH.DoDecrypt(oEncryptedData, sThumbprint);

		$(eResult).val(oDecryptedData.message);

		if (oDecryptedData.success === true) {
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}

	}

	NETTRASH.Exchange = function (sTextToExchange, sClientThumbprint, sServerThumbprint, eResult) {
		$(eResult).removeClass('success');
		$(eResult).removeClass('error');

		var oEncryptedData = NETTRASH.DoEncrypt(sTextToExchange, sServerThumbprint);
		console.log(JSON.stringify(oEncryptedData));

		var oRequest = {
			data: {
				sessionKeyDiversData: oEncryptedData.sessionKeyDiversData,
				sessionKeyIV: oEncryptedData.sessionKeyIV,
				dataEncrypted: oEncryptedData.dataEncrypted,
				encryptedSessionKey: oEncryptedData.encryptedSessionKey,
				thumbprintCertificate: sServerThumbprint,
				thumbprintAnswerCertificate: sClientThumbprint
			}
		};
		$.post(NETTRASH.ExchangeUrl, oRequest)
			.done(function (data) {
				console.log(JSON.stringify(data));

				var oDecryptedData = NETTRASH.DoDecrypt(data, sServerThumbprint);
				$(eResult).val(oDecryptedData.message);

				if (oDecryptedData.success === true) {
					$(eResult).addClass('success');
				} else {
					$(eResult).addClass('error');
				}
			})
			.fail(function (data) {
				console.log("Exchange failed");
				$(eResult).val("Exchange failed");
				$(eResult).addClass('error');
			});
	}

	var Base64 = {


		_keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",


		encode: function (input) {
			var output = "";
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = Base64._utf8_encode(input);

			while (i < input.length) {

				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

			}

			return output;
		},


		decode: function (input) {
			var output = "";
			var chr1, chr2, chr3;
			var enc1, enc2, enc3, enc4;
			var i = 0;

			input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

			while (i < input.length) {

				enc1 = this._keyStr.indexOf(input.charAt(i++));
				enc2 = this._keyStr.indexOf(input.charAt(i++));
				enc3 = this._keyStr.indexOf(input.charAt(i++));
				enc4 = this._keyStr.indexOf(input.charAt(i++));

				chr1 = (enc1 << 2) | (enc2 >> 4);
				chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
				chr3 = ((enc3 & 3) << 6) | enc4;

				output = output + String.fromCharCode(chr1);

				if (enc3 != 64) {
					output = output + String.fromCharCode(chr2);
				}
				if (enc4 != 64) {
					output = output + String.fromCharCode(chr3);
				}

			}

			output = Base64._utf8_decode(output);

			return output;

		},

		_utf8_encode: function (string) {
			string = string.replace(/\r\n/g, "\n");
			var utftext = "";

			for (var n = 0; n < string.length; n++) {

				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if ((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}

			}

			return utftext;
		},

		_utf8_decode: function (utftext) {
			var string = "";
			var i = 0;
			var c = c1 = c2 = 0;

			while (i < utftext.length) {

				c = utftext.charCodeAt(i);

				if (c < 128) {
					string += String.fromCharCode(c);
					i++;
				}
				else if ((c > 191) && (c < 224)) {
					c2 = utftext.charCodeAt(i + 1);
					string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}
				else {
					c2 = utftext.charCodeAt(i + 1);
					c3 = utftext.charCodeAt(i + 2);
					string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}

			}

			return string;
		}

	}

}(window.NETTRASH = window.NETTRASH || {}, jQuery));
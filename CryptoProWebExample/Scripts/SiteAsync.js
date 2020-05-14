function InitializePluginAsync() {
	console.log("NETTRASH.Initialization: Async");
	cadesplugin.async_spawn(function* () {
		var oAbout = yield cadesplugin.CreateObjectAsync("CAdESCOM.About");
		isCryptoProPluginLoaded = true;
		isCryptoProPluginEnabled = true;
		var oPluginVersion = yield oAbout.PluginVersion;
		if (typeof (oPluginVersion) == "undefined")
			oPluginVersion = yield oAbout.Version;
		var oVersion = yield oAbout.CSPVersion("", 80);
		var sCSPName = yield oAbout.CSPName(80);
		console.log("Plugin Ver:" + oPluginVersion.MajorVersion + "." + oPluginVersion.MinorVersion + "." + oPluginVersion.BuildVersion);
		console.log("CSP Ver:" + oVersion.MajorVersion + "." + oVersion.MinorVersion + "." + oVersion.BuildVersion);
		console.log("CSP Name: " + sCSPName)
		console.log("NETTRASH.Initialization: Done");
		initialization_done();
	});
}

function FillCertificatesAsync(eSelect) {
	cadesplugin.async_spawn(function* () {
		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates Store My is not accessible");
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sSubjectName = yield oCertificate.SubjectName;
			var sThumbprint = yield oCertificate.Thumbprint;
			var oItem = new Option(sSubjectName, sThumbprint);
			oItem.text = sSubjectName;
			$(eSelect).append(oItem);
		}

		yield oStore.Close();
	});
}

function SignTextAsync(sDataToSign, sSignThumbprint, eResult) {
	cadesplugin.async_spawn(function* () {
		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sThumbprint = yield oCertificate.Thumbprint;
			if (sThumbprint === sSignThumbprint) break;
		}

		if (!oCertificate) return;

		var oSigner = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPSigner");
		yield oSigner.propset_Certificate(oCertificate);
		yield oSigner.propset_TSAAddress("http://cryptopro.ru/tsp/");
		yield oSigner.propset_Options(cadesplugin.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN);

		var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
		yield oSignedData.propset_ContentEncoding(cadesplugin.CADESCOM_BASE64_TO_BINARY);
		yield oSignedData.propset_Content(Base64.encode(sDataToSign));

		try {
			var sSignedMessage = yield oSignedData.SignCades(oSigner, cadesplugin.CADESCOM_CADES_BES);
		} catch (oError) {
			alert("Failed to create signature. Error: " + cadesplugin.getLastError(oError));
			return;
		}

		yield oStore.Close();

		$(eResult).val(sSignedMessage);

		var bVerifyResult = true;

		var oSignedData = yield cadesplugin.CreateObjectAsync("CAdESCOM.CadesSignedData");
		oSignedData.ContentEncoding = cadesplugin.CADESCOM_BASE64_TO_BINARY;
		try {
			yield oSignedData.VerifyCades(sSignedMessage, cadesplugin.CADESCOM_CADES_BES, true);
		} catch (err) {
			alert("Failed to verify signature. Error: " + cadesplugin.getLastError(err));
			bVerifyResult = false;
		}

		$(eResult).removeClass('success');
		$(eResult).removeClass('error');
		if (bVerifyResult) {
			console.log("Signature verified");
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}
	});
}

function EncryptTextAsync(sTextToEncrypt, sEncryptThumbprint, eResult) {
	cadesplugin.async_spawn(function* () {
		$(eResult).removeClass('success');
		$(eResult).removeClass('error');

		var oEncryptedData = {
			success: false,
			sessionKeyDiversData: "",
			sessionKeyIV: "",
			dataEncrypted: "",
			encryptedSessionKey: "",
			errorMessage: ""
		};

		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			$(eResult).addClass('error');
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sThumbprint = yield oCertificate.Thumbprint;
			if (sThumbprint === sEncryptThumbprint) break;
		}

		var sDataToEncrypt = Base64.encode(sTextToEncrypt);

		if (sDataToEncrypt === "") {
			console.log("Empty data to encrypt");
			oStore.Close();
			result.errorMessage = "Empty data to encrypt";
			return result;
		}

		try {
			try {
				var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
			} catch (oError) {
				console.log("Failed to create cadescom.symmetricalgorithm: " + oError);
				yield oStore.Close();
				oEncryptedData.errorMessage = "Failed to create cadescom.symmetricalgorithm: " + oError;
				$(eResult).val(JSON.stringify(oEncryptedData));
				$(eResult).addClass('error');
				return;
			}

			yield oSymAlgo.GenerateKey();

			var oSessionKey = yield oSymAlgo.DiversifyKey();
			oEncryptedData.sessionKeyDiversData = yield oSessionKey.DiversData;
			oEncryptedData.sessionKeyIV = yield oSessionKey.IV;
			oEncryptedData.dataEncrypted = yield oSessionKey.Encrypt(sDataToEncrypt, 1);
			oEncryptedData.encryptedSessionKey = yield oSymAlgo.ExportKey(oCertificate);

			oEncryptedData.success = true;
			console.log("Data encrypted");
		}
		catch (oError) {
			console.log(oError);
			oEncryptedData.errorMessage = JSON.stringify(oError);
		}

		yield oStore.Close();

		$(eResult).val(JSON.stringify(oEncryptedData));

		if (oEncryptedData.success === true) {
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}
	});
}

function DecryptTextAsync(oEncryptedData, sDecryptThumbprint, eResult) {
	cadesplugin.async_spawn(function* () {
		var oDecryptedData = {
			success: false,
			message: ""
		};

		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			$(eResult).addClass('error');
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sThumbprint = yield oCertificate.Thumbprint;
			if (sThumbprint === sDecryptThumbprint) break;
		}

		try {
			try {
				var oSymAlgo = yield cadesplugin.CreateObjectAsync("cadescom.symmetricalgorithm");
			} catch (ex) {
				console.log("Failed to create cadescom.symmetricalgorithm: " + ex);
				yield oStore.Close();
				oDecryptedData.message = "Failed to create cadescom.symmetricalgorithm: " + ex;
				$(eResult).val(oDecryptedData.message);
				$(eResult).addClass('error');
				return;
			}

			yield oSymAlgo.ImportKey(oEncryptedData.encryptedSessionKey, oCertificate);
			yield oSymAlgo.propset_DiversData(oEncryptedData.sessionKeyDiversData);
			var oSesssionKey = yield oSymAlgo.DiversifyKey();
			yield oSesssionKey.propset_IV(oEncryptedData.sessionKeyIV);
			var sDecryptedData = yield oSesssionKey.Decrypt(oEncryptedData.dataEncrypted, 1);
			var sData = Base64.decode(sDecryptedData);

			oDecryptedData.message = sData;
			oDecryptedData.success = true;
			console.log("Data decrypted");
		}
		catch (ex) {
			oDecryptedData.message = ex;
			console.log(ex);
		}

		oStore.Close();

		$(eResult).val(oDecryptedData.message);

		if (oDecryptedData.success === true) {
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}
	});
}

function decryptAsync(oEncryptedData, sDecryptThumbprint, eResult) {
	cadesplugin.async_spawn(function* () {
		var oDecryptedData = {
			success: false,
			message: ""
		};

		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			$(eResult).addClass('error');
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sThumbprint = yield oCertificate.Thumbprint;
			if (sThumbprint === sDecryptThumbprint) break;
		}

		try {
			var oEnvelope = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPEnvelopedData");
			var recipients = yield oEnvelope.Recipients
			yield recipients.Add(oCertificate);
			yield oEnvelope.Decrypt(oEncryptedData.dataEncrypted);
			oDecryptedData.message = yield oEnvelope.Content;
			oDecryptedData.success = true;
			console.log("Data decrypted");
		}
		catch (ex) {
			oDecryptedData.message = ex;
			console.log(ex);
		}

		yield oStore.Close();

		$(eResult).val(oDecryptedData.message);

		if (oDecryptedData.success === true) {
			$(eResult).addClass('success');
		} else {
			$(eResult).addClass('error');
		}
	});
}

function encryptAsync(sTextToExchange, sServerThumbprint, sClientThumbprint, eResult) {
	cadesplugin.async_spawn(function* () {
		oEncryptedData = {
			success: false,
			sessionKeyDiversData: "",
			sessionKeyIV: "",
			dataEncrypted: "",
			encryptedSessionKey: "",
			errorMessage: ""
		};

		try {
			var oStore = yield cadesplugin.CreateObjectAsync("CAdESCOM.Store");
			yield oStore.Open();
		}
		catch (ex) {
			console.log("Certificates store My is not accessible");
			$(eResult).addClass('error');
			return;
		}

		var oCertificates = yield oStore.Certificates;
		var nCertCount = yield oCertificates.Count;
		for (var i = 1; i <= nCertCount; i++) {
			var oCertificate;
			try {
				oCertificate = yield oCertificates.Item(i);
			}
			catch (ex) {
				alert("Error while reading certificates: " + cadesplugin.getLastError(ex));
				return;
			}
			var sThumbprint = yield oCertificate.Thumbprint;
			if (sThumbprint === sServerThumbprint) break;
		}

		var sDataToEncrypt = Base64.encode(sTextToExchange);

		if (sDataToEncrypt === "") {
			console.log("Empty data to encrypt");
			oStore.Close();
			return;
		}

		try {
			var oEnvelope = yield cadesplugin.CreateObjectAsync("CAdESCOM.CPEnvelopedData");
			yield oEnvelope.propset_Content(sTextToExchange);
			var recipients = yield oEnvelope.Recipients
			yield recipients.Add(oCertificate);
			oEncryptedData.dataEncrypted = yield oEnvelope.Encrypt();
		}
		catch (oError) {
			console.log(oError);
		}

		yield oStore.Close();

		DoExchange(oEncryptedData, sServerThumbprint, sClientThumbprint, eResult);
	});
}

async_resolve();
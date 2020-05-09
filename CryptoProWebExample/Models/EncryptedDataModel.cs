using System.Security.Cryptography.X509Certificates;

namespace CryptoProWebExample.Models
{
	public class EncryptedDataModel
	{
		#region Public properties
		
		
		
		public string sessionKeyDiversData { get; set; }

		public string sessionKeyIV { get; set; }

		public string dataEncrypted { get; set; }

		public string encryptedSessionKey { get; set; }

		public string thumbprintCertificate { get; set; }

		public string thumbprintAnswerCertificate { get; set; }



		#endregion
		#region Private methods



		private X509Certificate2 _getCertificate(string sThumbprint)
		{
			X509Certificate2 retVal = null;
			X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
			store.Open(OpenFlags.OpenExistingOnly);
			var certs = store.Certificates.Find(X509FindType.FindByThumbprint, sThumbprint, true);
			if (certs.Count > 0)
			{
				retVal = certs[0];
			}
			return retVal;
		}



		#endregion
		#region Public methods



		public X509Certificate2 GetCertificate()
		{
			return _getCertificate(thumbprintCertificate);
		}

		public X509Certificate2 GetAnswerCertificate()
		{
			return _getCertificate(thumbprintAnswerCertificate);
		}

		public byte[] GetMessage()
		{
			byte[] retVal = null;
			return retVal;
		}



		#endregion
	}
}
using CryptoProWebExample.Models;
using System.Web.Mvc;

namespace CryptoProWebExample.Controllers
{
	public class HomeController : Controller
	{
		public ActionResult Index()
		{
			return View();
		}

		public ActionResult Encrypt()
		{
			return View();
		}

		public ActionResult Decrypt()
		{
			return View();
		}
		public ActionResult Exchange()
		{
			return View();
		}

		[HttpPost]
		public ActionResult DoExchange(EncryptedDataModel data)
		{
			return Json(data);
		}
	}
}